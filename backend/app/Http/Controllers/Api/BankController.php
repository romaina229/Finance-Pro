<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use App\Models\BankReconciliation;
use App\Models\BankTransaction;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class BankController extends Controller
{
    public function index(Organization $organization): JsonResponse
    {
        $data = $organization->bankAccounts()->orderBy('name')->get()->map(fn (BankAccount $account) => $this->payload($account));
        return response()->json(['data' => $data]);
    }

    public function storeAccount(Request $request, Organization $organization): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required','string','max:50',Rule::unique('bank_accounts','code')->where('organization_id',$organization->id)],
            'name' => ['required','string','max:255'], 'bank_name' => ['required','string','max:255'],
            'account_number' => ['nullable','string','max:100'], 'currency' => ['required','string','size:3'],
            'opening_balance' => ['required','numeric'],
        ]);
        $account = $organization->bankAccounts()->create([...$data, 'status' => 'open']);
        return response()->json(['data' => $this->payload($account)], 201);
    }

    public function updateAccount(Request $request, Organization $organization, BankAccount $bankAccount): JsonResponse
    {
        $this->ensureBelongs($bankAccount, $organization);
        $data = $request->validate([
            'name' => ['sometimes','required','string','max:255'], 'bank_name' => ['sometimes','required','string','max:255'],
            'account_number' => ['nullable','string','max:100'], 'currency' => ['sometimes','required','string','size:3'],
            'status' => ['sometimes',Rule::in(['open','closed'])],
        ]);
        $bankAccount->update($data);
        return response()->json(['data' => $this->payload($bankAccount->fresh())]);
    }

    public function transactions(Request $request, Organization $organization, BankAccount $bankAccount): JsonResponse
    {
        $this->ensureBelongs($bankAccount, $organization);
        return response()->json($bankAccount->transactions()->with('project:id,name','creator:id,full_name')->where('status','posted')->latest('transaction_date')->paginate(min($request->integer('per_page',50),100)));
    }

    public function storeTransaction(Request $request, Organization $organization, BankAccount $bankAccount): JsonResponse
    {
        $this->ensureBelongs($bankAccount, $organization);
        abort_if($bankAccount->status !== 'open', 422, 'Ce compte bancaire est fermé.');
        $data = $request->validate([
            'type' => ['required',Rule::in(['in','out'])], 'amount' => ['required','numeric','gt:0'], 'transaction_date' => ['required','date'],
            'reference' => ['nullable','string','max:100'], 'description' => ['nullable','string','max:2000'],
            'project_id' => ['nullable','uuid',Rule::exists('projects','id')->where('organization_id',$organization->id)],
        ]);
        if ($data['type'] === 'out' && $data['amount'] > $this->balance($bankAccount)) {
            return response()->json(['message'=>'Solde bancaire insuffisant pour cette sortie.'],422);
        }

        // Verrouille la ligne du compte bancaire pendant la vérification de solde
        // + l'insertion, pour éviter qu'une écriture concurrente (ex: deux dépenses
        // marquées payées en même temps) ne fasse passer le solde en négatif.
        // Reproduit le même schéma que CashController::storeTransaction.
        $transaction = DB::transaction(function () use ($request, $organization, $bankAccount, $data) {
            $lockedAccount = BankAccount::query()->whereKey($bankAccount->id)->lockForUpdate()->firstOrFail();

            if ($data['type'] === 'out' && (float) $data['amount'] > $this->balance($lockedAccount)) {
                abort(response()->json(['message' => 'Solde bancaire insuffisant pour cette sortie.'], 422));
            }

            return $lockedAccount->transactions()->create([
                ...$data,
                'organization_id' => $organization->id,
                'created_by' => $request->user()->id,
                'status' => 'posted',
            ]);
        });

        return response()->json(['data'=>$transaction->load('project:id,name','creator:id,full_name')],201);
    }

    public function reconciliations(Organization $organization, BankAccount $bankAccount): JsonResponse
    {
        $this->ensureBelongs($bankAccount,$organization);
        return response()->json(['data'=>$bankAccount->reconciliations()->with('reconciler:id,full_name')->latest('reconciliation_date')->limit(20)->get()]);
    }

    public function reconcile(Request $request, Organization $organization, BankAccount $bankAccount): JsonResponse
    {
        $this->ensureBelongs($bankAccount,$organization);
        $data=$request->validate(['reconciliation_date'=>['required','date'],'statement_balance'=>['required','numeric'],'notes'=>['nullable','string','max:2000']]);
        $book=$this->balance($bankAccount);
        $reconciliation=$bankAccount->reconciliations()->create([...$data,'organization_id'=>$organization->id,'reconciled_by'=>$request->user()->id,'book_balance'=>$book,'difference'=>round((float)$data['statement_balance']-$book,2)]);
        return response()->json(['data'=>$reconciliation->load('reconciler:id,full_name')],201);
    }

    private function payload(BankAccount $account): array
    {
        return ['id'=>$account->id,'code'=>$account->code,'name'=>$account->name,'bank_name'=>$account->bank_name,'account_number'=>$account->account_number,'currency'=>$account->currency,'opening_balance'=>$account->opening_balance,'current_balance'=>number_format($this->balance($account),2,'.',''),'status'=>$account->status];
    }

    private function balance(BankAccount $account): float
    {
        $in=(float)$account->transactions()->where('status','posted')->where('type','in')->sum('amount');
        $out=(float)$account->transactions()->where('status','posted')->where('type','out')->sum('amount');
        return round((float)$account->opening_balance+$in-$out,2);
    }

    private function ensureBelongs(BankAccount $account, Organization $organization): void { abort_unless($account->organization_id === $organization->id,404); }
}
