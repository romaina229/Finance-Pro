<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashReconciliation;
use App\Models\CashRegister;
use App\Models\CashTransaction;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CashController extends Controller
{
    public function index(Organization $organization): JsonResponse
    {
        $registers = CashRegister::query()
            ->where('organization_id', $organization->id)
            ->with('custodian:id,name,email')
            ->orderBy('name')
            ->get()
            ->map(fn (CashRegister $register) => $this->registerPayload($register));

        return response()->json(['data' => $registers]);
    }

    public function storeRegister(Request $request, Organization $organization): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', Rule::unique('cash_registers', 'code')->where('organization_id', $organization->id)],
            'name' => ['required', 'string', 'max:255'],
            'currency' => ['required', 'string', 'size:3'],
            'custodian_id' => ['nullable', 'uuid', Rule::exists('user_organizations', 'user_id')->where('organization_id', $organization->id)->where('status', 'active')],
            'location' => ['nullable', 'string', 'max:255'],
            'opening_balance' => ['required', 'numeric', 'min:0'],
        ]);

        $register = $organization->cashRegisters()->create($data);

        return response()->json(['data' => $this->registerPayload($register->load('custodian:id,name,email'))], 201);
    }

    public function updateRegister(Request $request, Organization $organization, CashRegister $cashRegister): JsonResponse
    {
        $this->ensureRegisterBelongsToOrganization($cashRegister, $organization);

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'currency' => ['sometimes', 'required', 'string', 'size:3'],
            'custodian_id' => ['nullable', 'uuid', Rule::exists('user_organizations', 'user_id')->where('organization_id', $organization->id)->where('status', 'active')],
            'location' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', Rule::in(['open', 'closed'])],
        ]);

        $cashRegister->update($data);

        return response()->json(['data' => $this->registerPayload($cashRegister->fresh('custodian:id,name,email'))]);
    }

    public function destroyRegister(Organization $organization, CashRegister $cashRegister): JsonResponse
    {
        $this->ensureRegisterBelongsToOrganization($cashRegister, $organization);

        if ($cashRegister->transactions()->exists()) {
            return response()->json(['message' => 'Cette caisse possède déjà des opérations et ne peut pas être supprimée. Fermez-la plutôt.'], 422);
        }

        $cashRegister->delete();
        return response()->json(['message' => 'Caisse supprimée.']);
    }

    public function transactions(Request $request, Organization $organization, CashRegister $cashRegister): JsonResponse
    {
        $this->ensureRegisterBelongsToOrganization($cashRegister, $organization);

        $transactions = $cashRegister->transactions()
            ->with('creator:id,name', 'project:id,name')
            ->where('status', 'posted')
            ->orderByDesc('transaction_date')
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 20), 100));

        return response()->json($transactions);
    }

    public function storeTransaction(Request $request, Organization $organization, CashRegister $cashRegister): JsonResponse
    {
        $this->ensureRegisterBelongsToOrganization($cashRegister, $organization);

        if ($cashRegister->status !== 'open') {
            return response()->json(['message' => 'Cette caisse est fermée.'], 422);
        }

        $data = $request->validate([
            'type' => ['required', Rule::in(['in', 'out'])],
            'amount' => ['required', 'numeric', 'gt:0'],
            'transaction_date' => ['required', 'date'],
            'reference' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
            'project_id' => ['nullable', 'uuid', Rule::exists('projects', 'id')->where('organization_id', $organization->id)],
        ]);

        $transaction = DB::transaction(function () use ($request, $organization, $cashRegister, $data) {
            $balance = $this->theoreticalBalance($cashRegister->id, true);
            $amount = (float) $data['amount'];

            if ($data['type'] === 'out' && $amount > $balance) {
                abort(response()->json(['message' => 'Solde de caisse insuffisant pour cette sortie.'], 422));
            }

            return $cashRegister->transactions()->create([
                ...$data,
                'organization_id' => $organization->id,
                'created_by' => $request->user()->id,
                'status' => 'posted',
            ]);
        });

        return response()->json(['data' => $transaction->load('creator:id,name', 'project:id,name')], 201);
    }

    public function reconciliations(Organization $organization, CashRegister $cashRegister): JsonResponse
    {
        $this->ensureRegisterBelongsToOrganization($cashRegister, $organization);

        return response()->json([
            'data' => $cashRegister->reconciliations()
                ->with('reconciler:id,name')
                ->latest('reconciliation_date')
                ->limit(20)
                ->get(),
        ]);
    }

    public function reconcile(Request $request, Organization $organization, CashRegister $cashRegister): JsonResponse
    {
        $this->ensureRegisterBelongsToOrganization($cashRegister, $organization);

        $data = $request->validate([
            'reconciliation_date' => ['required', 'date'],
            'physical_balance' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $theoretical = $this->theoreticalBalance($cashRegister->id);
        $reconciliation = $cashRegister->reconciliations()->create([
            'organization_id' => $organization->id,
            'reconciled_by' => $request->user()->id,
            'reconciliation_date' => $data['reconciliation_date'],
            'theoretical_balance' => $theoretical,
            'physical_balance' => $data['physical_balance'],
            'difference' => round((float) $data['physical_balance'] - $theoretical, 2),
            'notes' => $data['notes'] ?? null,
        ]);

        return response()->json(['data' => $reconciliation->load('reconciler:id,name')], 201);
    }

    private function registerPayload(CashRegister $register): array
    {
        $balance = $this->theoreticalBalance($register->id);

        return [
            'id' => $register->id,
            'code' => $register->code,
            'name' => $register->name,
            'currency' => $register->currency,
            'location' => $register->location,
            'status' => $register->status,
            'opening_balance' => $register->opening_balance,
            'current_balance' => number_format($balance, 2, '.', ''),
            'custodian' => $register->custodian,
        ];
    }

    private function theoreticalBalance(string $cashRegisterId, bool $lock = false): float
    {
        $register = CashRegister::query()->findOrFail($cashRegisterId);
        $query = CashTransaction::query()
            ->where('cash_register_id', $cashRegisterId)
            ->where('status', 'posted');

        if ($lock) {
            $query->lockForUpdate();
        }

        $in = (float) (clone $query)->where('type', 'in')->sum('amount');
        $out = (float) (clone $query)->where('type', 'out')->sum('amount');

        return round((float) $register->opening_balance + $in - $out, 2);
    }

    private function ensureRegisterBelongsToOrganization(CashRegister $cashRegister, Organization $organization): void
    {
        abort_unless($cashRegister->organization_id === $organization->id, 404);
    }
}
