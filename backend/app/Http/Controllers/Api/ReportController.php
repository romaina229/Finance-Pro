<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Project;
use App\Models\Revenue;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function summary(Request $request, string $organization)
    {
        $from = $request->date('from')?->startOfDay() ?? now()->subMonths(5)->startOfMonth();
        $to = $request->date('to')?->endOfDay() ?? now()->endOfDay();

        if ($from->gt($to)) {
            return response()->json(['message' => 'La date de début doit précéder la date de fin.'], 422);
        }

        $expenseQuery = Expense::query()
            ->where('organization_id', $organization)
            ->whereBetween('expense_date', [$from->toDateString(), $to->toDateString()])
            ->whereIn('status', ['approved', 'paid']);

        $revenueQuery = Revenue::query()
            ->where('organization_id', $organization)
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
                'revenues' => (float) Revenue::query()->where('organization_id', $organization)
                    ->whereBetween('received_date', [$monthFrom->toDateString(), $monthTo->toDateString()])
                    ->whereIn('status', ['approved', 'paid'])->sum('amount_in_org_currency'),
                'expenses' => (float) Expense::query()->where('organization_id', $organization)
                    ->whereBetween('expense_date', [$monthFrom->toDateString(), $monthTo->toDateString()])
                    ->whereIn('status', ['approved', 'paid'])->sum('amount_in_org_currency'),
            ];
            $cursor->addMonth();
        }

        $projects = Project::query()
            ->where('organization_id', $organization)
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
                    'projects' => Project::where('organization_id', $organization)->count(),
                ],
                'monthly' => $monthly,
                'projects' => $projects,
            ],
        ]);
    }
}
