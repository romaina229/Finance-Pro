<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetLine;
use App\Models\Expense;
use App\Models\Organization;
use App\Models\Project;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BudgetLineController extends Controller
{
    public function index(Request $request, Organization $organization, Project $project): JsonResponse
    {
        $this->ensureProject($project, $organization->id);
        $year = $request->integer('year', now()->year);
        $lines = BudgetLine::query()->where('organization_id', $organization->id)->where('project_id', $project->id)->where('fiscal_year', $year)->with('category:id,code,name')->orderBy('label')->get();

        // Consommation réelle PAR ligne budgétaire, via le lien direct expenses.budget_line_id
        // (auparavant, seule une somme globale au projet était possible : aucune dépense
        // n'était jamais rattachée à une ligne précise).
        $actualByLine = Expense::query()
            ->where('organization_id', $organization->id)
            ->where('project_id', $project->id)
            ->whereIn('budget_line_id', $lines->pluck('id'))
            ->whereIn('status', ['approved', 'paid'])
            ->groupBy('budget_line_id')
            ->selectRaw('budget_line_id, SUM(amount_in_org_currency) as total')
            ->pluck('total', 'budget_line_id');

        $linesPayload = $lines->map(function (BudgetLine $line) use ($actualByLine) {
            $actual = (float) ($actualByLine[$line->id] ?? 0);
            return $this->payload($line, $actual);
        });

        $planned = (float) $lines->sum('planned_amount');
        // Le total "actual" du projet reste la somme de TOUTES les dépenses du projet
        // (y compris celles non rattachées à une ligne précise), pour ne pas perdre de
        // visibilité sur les dépenses "non affectées" — mais chaque ligne affiche
        // désormais sa propre consommation réelle et fiable.
        $actual = (float) Expense::query()->where('organization_id', $organization->id)->where('project_id', $project->id)->whereYear('expense_date', $year)->whereIn('status', ['approved', 'paid'])->sum('amount_in_org_currency');
        $unallocated = round($actual - (float) $actualByLine->sum(), 2);

        return response()->json(['data' => $linesPayload, 'summary' => ['year' => $year, 'project_budget' => (float) $project->total_budget, 'planned' => round($planned, 2), 'actual' => round($actual, 2), 'remaining' => round($planned - $actual, 2), 'consumption_rate' => $planned > 0 ? round(($actual / $planned) * 100, 1) : 0, 'unallocated' => $unallocated]]);
    }

    public function store(Request $request, Organization $organization, Project $project): JsonResponse
    {
        $this->ensureProject($project, $organization->id);
        $this->ensurePermission($request, 'budgets.manage');
        $data = $request->validate(['category_id' => ['nullable', 'uuid', Rule::exists('expense_categories', 'id')->where('organization_id', $organization->id)], 'fiscal_year' => ['required', 'integer', 'min:2020', 'max:2100'], 'label' => ['required', 'string', 'max:255'], 'planned_amount' => ['required', 'numeric', 'gte:0'], 'currency' => ['required', 'string', 'size:3'], 'notes' => ['nullable', 'string', 'max:2000']]);
        $line = BudgetLine::create([...$data, 'organization_id' => $organization->id, 'project_id' => $project->id]);
        return response()->json(['data' => $this->payload($line->load('category:id,code,name'))], 201);
    }

    public function show(Organization $organization, Project $project, BudgetLine $budget_line): JsonResponse
    {
        $this->ensureLine($budget_line, $project, $organization->id);
        return response()->json(['data' => $this->payload($budget_line->load('category:id,code,name'))]);
    }

    public function update(Request $request, Organization $organization, Project $project, BudgetLine $budget_line): JsonResponse
    {
        $this->ensureLine($budget_line, $project, $organization->id);
        $this->ensurePermission($request, 'budgets.manage');
        $data = $request->validate(['category_id' => ['nullable', 'uuid', Rule::exists('expense_categories', 'id')->where('organization_id', $organization->id)], 'fiscal_year' => ['sometimes', 'integer', 'min:2020', 'max:2100'], 'label' => ['sometimes', 'required', 'string', 'max:255'], 'planned_amount' => ['sometimes', 'required', 'numeric', 'gte:0'], 'currency' => ['sometimes', 'required', 'string', 'size:3'], 'notes' => ['nullable', 'string', 'max:2000']]);
        $budget_line->update($data);
        return response()->json(['data' => $this->payload($budget_line->fresh('category:id,code,name'))]);
    }

    public function destroy(Request $request, Organization $organization, Project $project, BudgetLine $budget_line): JsonResponse
    {
        $this->ensureLine($budget_line, $project, $organization->id);
        $this->ensurePermission($request, 'budgets.manage');
        $budget_line->delete();
        return response()->json(['message' => 'Ligne budgétaire supprimée.']);
    }

    private function payload(BudgetLine $line, float $actual = 0): array
    {
        $planned = (float) $line->planned_amount;
        return ['id' => $line->id, 'project_id' => $line->project_id, 'category_id' => $line->category_id, 'category' => $line->category ? ['id' => $line->category->id, 'code' => $line->category->code, 'name' => $line->category->name] : null, 'fiscal_year' => $line->fiscal_year, 'label' => $line->label, 'planned_amount' => $planned, 'currency' => $line->currency, 'notes' => $line->notes, 'actual' => round($actual, 2), 'remaining' => round($planned - $actual, 2), 'consumption_rate' => $planned > 0 ? round(($actual / $planned) * 100, 1) : 0];
    }

    private function ensureProject(Project $project, string $organizationId): void { abort_unless($project->organization_id === $organizationId, 404); }
    private function ensureLine(BudgetLine $line, Project $project, string $organizationId): void { abort_unless($line->organization_id === $organizationId && $line->project_id === $project->id, 404); }
    private function ensurePermission(Request $request, string $permission): void { $roleId = $request->attributes->get('org_role_id'); $role = $roleId ? Role::find($roleId) : null; abort_unless($role && $role->hasPermission($permission), 403, "Vous n'avez pas la permission requise ({$permission}) pour cette action."); }
}
