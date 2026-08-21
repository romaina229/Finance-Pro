<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Organization;
use App\Models\Project;
use App\Models\Revenue;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function summary(Request $request, Organization $organization)
    {
        $organizationId = $organization->id;

        $from = $request->date('from')?->startOfDay() ?? now()->subMonths(5)->startOfMonth();
        $to = $request->date('to')?->endOfDay() ?? now()->endOfDay();

        if ($from->gt($to)) {
            return response()->json(['message' => 'La date de début doit précéder la date de fin.'], 422);
        }

        $expenseQuery = Expense::query()
            ->where('organization_id', $organizationId)
            ->whereBetween('expense_date', [$from->toDateString(), $to->toDateString()])
            ->whereIn('status', ['approved', 'paid']);

        $revenueQuery = Revenue::query()
            ->where('organization_id', $organizationId)
            ->whereBetween('received_date', [$from->toDateString(), $to->toDateString()])
            ->whereIn('status', ['approved', 'paid']);

        $expenses = (float) $expenseQuery->sum('amount_in_org_currency');
        $revenues = (float) $revenueQuery->sum('amount_in_org_currency');

        $monthly = [];
        $cursor = $from->copy()->startOfMonth();
        $lastMonth = $to->copy()->startOfMonth();
        while ($cursor->lte($lastMonth)) {
            $monthFrom = $cursor->copy()->startOfMonth()->max($from);
            $monthTo = $cursor->copy()->endOfMonth()->min($to);
            $monthly[] = [
                'month' => $cursor->format('Y-m'),
                'label' => $cursor->locale('fr')->translatedFormat('M Y'),
                'revenues' => (float) Revenue::query()->where('organization_id', $organizationId)
                    ->whereBetween('received_date', [$monthFrom->toDateString(), $monthTo->toDateString()])
                    ->whereIn('status', ['approved', 'paid'])->sum('amount_in_org_currency'),
                'expenses' => (float) Expense::query()->where('organization_id', $organizationId)
                    ->whereBetween('expense_date', [$monthFrom->toDateString(), $monthTo->toDateString()])
                    ->whereIn('status', ['approved', 'paid'])->sum('amount_in_org_currency'),
            ];
            $cursor->addMonth();
        }

        $projects = Project::query()
            ->where('organization_id', $organizationId)
            ->withSum(['expenses as expenses_total' => fn ($q) => $q->whereIn('status', ['approved', 'paid'])
                ->whereBetween('expense_date', [$from->toDateString(), $to->toDateString()])], 'amount_in_org_currency')
            ->withSum(['revenues as revenues_total' => fn ($q) => $q->whereIn('status', ['approved', 'paid'])
                ->whereBetween('received_date', [$from->toDateString(), $to->toDateString()])], 'amount_in_org_currency')
            ->orderByDesc('total_budget')
            ->limit(10)
            ->get(['id', 'code', 'name', 'total_budget', 'currency', 'status'])
            ->map(fn ($project) => [
                'id' => $project->id,
                'code' => $project->code,
                'name' => $project->name,
                'total_budget' => (float) $project->total_budget,
                'currency' => $project->currency,
                'status' => $project->status,
                'revenues' => (float) ($project->revenues_total ?? 0),
                'expenses' => (float) ($project->expenses_total ?? 0),
                'balance' => (float) (($project->revenues_total ?? 0) - ($project->expenses_total ?? 0)),
            ])->values();

        return response()->json([
            'data' => [
                'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
                'totals' => [
                    'revenues' => $revenues,
                    'expenses' => $expenses,
                    'balance' => $revenues - $expenses,
                    'projects' => Project::where('organization_id', $organizationId)->count(),
                ],
                'monthly' => $monthly,
                'projects' => $projects,
            ],
        ]);
    }

    /**
     * Export CSV des écritures détaillées (dépenses + recettes approuvées ou
     * payées) sur la période — ouvrable directement dans Excel/LibreOffice/
     * Google Sheets. Généré en PHP pur (fputcsv), sans dépendance externe.
     */
    public function export(Request $request, Organization $organization)
    {
        $organizationId = $organization->id;
        $from = $request->date('from')?->startOfDay() ?? now()->subMonths(5)->startOfMonth();
        $to = $request->date('to')?->endOfDay() ?? now()->endOfDay();

        $expenses = Expense::query()
            ->where('organization_id', $organizationId)
            ->whereBetween('expense_date', [$from->toDateString(), $to->toDateString()])
            ->whereIn('status', ['approved', 'paid'])
            ->with(['project:id,code,name', 'category:id,name', 'paymentMethod:id,name'])
            ->orderBy('expense_date')
            ->get()
            ->map(fn (Expense $e) => [
                'date' => $e->expense_date->toDateString(),
                'type' => 'Dépense',
                'projet' => $e->project?->name ?? '',
                'categorie_tiers' => $e->category?->name ?? ($e->supplier_name ?? ''),
                'montant' => (float) $e->amount_in_org_currency,
                'devise' => $organization->default_currency,
                'moyen_paiement' => $e->paymentMethod?->name ?? '',
                'statut' => $e->status,
                'description' => $e->description ?? '',
            ]);

        $revenues = Revenue::query()
            ->where('organization_id', $organizationId)
            ->whereBetween('received_date', [$from->toDateString(), $to->toDateString()])
            ->whereIn('status', ['approved', 'paid'])
            ->with(['project:id,code,name', 'donor:id,name', 'paymentMethod:id,name'])
            ->orderBy('received_date')
            ->get()
            ->map(fn (Revenue $r) => [
                'date' => $r->received_date->toDateString(),
                'type' => 'Recette',
                'projet' => $r->project?->name ?? '',
                'categorie_tiers' => $r->donor?->name ?? $r->revenue_type,
                'montant' => (float) $r->amount_in_org_currency,
                'devise' => $organization->default_currency,
                'moyen_paiement' => $r->paymentMethod?->name ?? '',
                'statut' => $r->status,
                'description' => $r->description ?? '',
            ]);

        $rows = $expenses->concat($revenues)->sortBy('date')->values();

        $filename = 'comptabilite_' . str_replace(' ', '_', $organization->name) . '_' . $from->format('Y-m-d') . '_a_' . $to->format('Y-m-d') . '.csv';

        return response()->streamDownload(function () use ($rows) {
            $handle = fopen('php://output', 'w');
            // BOM UTF-8 : Excel sous Windows ouvre sinon les accents mal encodés.
            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, ['Date', 'Type', 'Projet', 'Catégorie / Tiers', 'Montant', 'Devise', 'Moyen de paiement', 'Statut', 'Description'], ';');

            foreach ($rows as $row) {
                fputcsv($handle, [
                    $row['date'], $row['type'], $row['projet'], $row['categorie_tiers'],
                    number_format($row['montant'], 2, ',', ''), $row['devise'], $row['moyen_paiement'],
                    $row['statut'], $row['description'],
                ], ';');
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
