<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class ExpenseController extends Controller
{
    public function index(Request $request, Organization $organization)
    {
        $query = $organization->expenses()
            ->with(['project:id,name,code', 'category:id,name,code', 'paymentMethod:id,name', 'creator:id,full_name']);

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->project_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json(['data' => $query->orderByDesc('expense_date')->get()]);
    }

    public function show(Request $request, Organization $organization, Expense $expense)
    {
        abort_if($expense->organization_id !== $organization->id, 404);

        return response()->json(['data' => $expense->load(['project', 'category', 'paymentMethod', 'creator', 'approver'])]);
    }

    /**
     * Crée une dépense en brouillon. Le montant en devise de l'organisation
     * est calculé simplement ici (1:1 si même devise) — la conversion réelle
     * via exchange_rates sera affinée quand le module multi-devise sera étoffé.
     */
    public function store(Request $request, Organization $organization)
    {
        $validator = Validator::make($request->all(), $this->rules());

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $data = $validator->validated();
        $data['currency'] = $data['currency'] ?? $organization->default_currency;
        $data['amount_in_org_currency'] = $data['currency'] === $organization->default_currency
            ? $data['amount']
            : $data['amount']; // TODO: appliquer exchange_rates quand la devise diffère

        $expense = $organization->expenses()->create([
            ...$data,
            'created_by' => $request->user()->id,
            'status' => 'draft',
        ]);

        return response()->json(['data' => $expense->load(['project', 'category', 'paymentMethod'])], 201);
    }

    public function update(Request $request, Organization $organization, Expense $expense)
    {
        abort_if($expense->organization_id !== $organization->id, 404);

        if (! in_array($expense->status, ['draft', 'rejected'])) {
            return response()->json([
                'message' => 'Seule une dépense en brouillon ou rejetée peut être modifiée.',
            ], 422);
        }

        $validator = Validator::make($request->all(), $this->rules(true));

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $expense->update($validator->validated());

        return response()->json(['data' => $expense->fresh(['project', 'category', 'paymentMethod'])]);
    }

    public function destroy(Request $request, Organization $organization, Expense $expense)
    {
        abort_if($expense->organization_id !== $organization->id, 404);

        if ($expense->status !== 'draft') {
            return response()->json([
                'message' => 'Seule une dépense en brouillon peut être supprimée. Utilisez le rejet pour les autres statuts.',
            ], 422);
        }

        $expense->delete();

        return response()->json(['message' => 'Dépense supprimée.']);
    }

    /**
     * Soumission pour approbation : draft/rejected -> pending_approval.
     * Toute personne ayant le droit de créer des dépenses peut soumettre les siennes.
     */
    public function submit(Request $request, Organization $organization, Expense $expense)
    {
        abort_if($expense->organization_id !== $organization->id, 404);

        if (! in_array($expense->status, ['draft', 'rejected'])) {
            return response()->json(['message' => 'Cette dépense ne peut pas être soumise dans son état actuel.'], 422);
        }

        $expense->update([
            'status' => 'pending_approval',
            'submitted_at' => now(),
            'rejection_reason' => null,
        ]);

        return response()->json(['data' => $expense->fresh()]);
    }

    /**
     * Approbation — protégée par permission:expenses.approve dans routes/api.php.
     */
    public function approve(Request $request, Organization $organization, Expense $expense)
    {
        abort_if($expense->organization_id !== $organization->id, 404);

        if ($expense->status !== 'pending_approval') {
            return response()->json(['message' => 'Seule une dépense en attente peut être approuvée.'], 422);
        }

        $expense->update([
            'status' => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return response()->json(['data' => $expense->fresh()]);
    }

    public function reject(Request $request, Organization $organization, Expense $expense)
    {
        abort_if($expense->organization_id !== $organization->id, 404);

        $validator = Validator::make($request->all(), [
            'rejection_reason' => ['required', 'string', 'max:500'],
        ]);
        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        if ($expense->status !== 'pending_approval') {
            return response()->json(['message' => 'Seule une dépense en attente peut être rejetée.'], 422);
        }

        $expense->update([
            'status' => 'rejected',
            'rejection_reason' => $request->rejection_reason,
        ]);

        return response()->json(['data' => $expense->fresh()]);
    }

    /**
     * Marque une dépense approuvée comme effectivement payée
     * (décaissement terrain confirmé — espèces remises, mobile money envoyé...).
     */
    public function markPaid(Request $request, Organization $organization, Expense $expense)
    {
        abort_if($expense->organization_id !== $organization->id, 404);

        if ($expense->status !== 'approved') {
            return response()->json(['message' => 'Seule une dépense approuvée peut être marquée payée.'], 422);
        }

        $expense->update(['status' => 'paid']);

        return response()->json(['data' => $expense->fresh()]);
    }

    private function rules(bool $isUpdate = false): array
    {
        $req = $isUpdate ? 'sometimes' : 'required';

        return [
            'project_id'          => [$req, 'uuid', 'exists:projects,id'],
            'category_id'         => ['nullable', 'uuid', 'exists:expense_categories,id'],
            'amount'              => [$req, 'numeric', 'min:0.01'],
            'currency'            => ['nullable', 'string', 'size:3', 'exists:currencies,code'],
            'supplier_name'       => ['nullable', 'string', 'max:255'],
            'supplier_contact'    => ['nullable', 'string', 'max:150'],
            'payment_method_id'   => [$req, 'integer', 'exists:payment_methods,id'],
            'payment_reference'   => ['nullable', 'string', 'max:100'],
            'expense_date'        => [$req, 'date'],
            'description'         => ['nullable', 'string'],
        ];
    }
}
