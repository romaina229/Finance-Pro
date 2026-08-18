<?php

namespace App\Services;

use App\Models\BankAccount;
use App\Models\BankTransaction;
use App\Models\CashRegister;
use App\Models\CashTransaction;
use App\Models\Expense;
use App\Models\Revenue;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FinancialPostingService
{
    public function postExpense(Expense $expense): void { DB::transaction(fn () => $this->post($expense, false)); }
    public function postRevenue(Revenue $revenue): void { DB::transaction(fn () => $this->post($revenue, true)); }

    private function post(Expense|Revenue $operation, bool $isRevenue): void
    {
        $operation->loadMissing('paymentMethod');
        $method = $operation->paymentMethod;
        if (! $method) throw ValidationException::withMessages(['payment_method_id' => 'Le mode de paiement est obligatoire.']);

        $isCash = $method->code === 'cash';
        // Un chèque débite in fine un compte bancaire (c'est là qu'il est encaissé/décaissé) :
        // il est donc traité comme les autres moyens de paiement bancaires, pas comme la caisse.
        $isBank = in_array($method->code, ['bank_transfer','cheque','mobile_money_mtn','mobile_money_moov','mobile_money_orange'], true);

        if ($isCash) {
            if (! $operation->cash_register_id) throw ValidationException::withMessages(['cash_register_id' => 'Sélectionnez la caisse utilisée.']);
            $register = CashRegister::query()->where('organization_id',$operation->organization_id)->whereKey($operation->cash_register_id)->where('currency',$operation->currency)->where('status','open')->lockForUpdate()->first();
            if (! $register) throw ValidationException::withMessages(['cash_register_id' => 'La caisse sélectionnée est invalide pour cette organisation ou cette devise.']);
            if (! $isRevenue) {
                $balance = (float)$register->opening_balance + (float)$register->transactions()->where('status','posted')->where('type','in')->sum('amount') - (float)$register->transactions()->where('status','posted')->where('type','out')->sum('amount');
                if ((float)$operation->amount > $balance) throw ValidationException::withMessages(['amount' => 'Solde de caisse insuffisant pour cette dépense.']);
            }
            CashTransaction::create(['cash_register_id'=>$register->id,'organization_id'=>$operation->organization_id,'project_id'=>$operation->project_id,'created_by'=>$operation->created_by,'type'=>$isRevenue?'in':'out','amount'=>$operation->amount,'transaction_date'=>$isRevenue?$operation->received_date:$operation->expense_date,'reference'=>$operation->payment_reference,'description'=>$operation->description,'status'=>'posted']);
            return;
        }

        if ($isBank) {
            if (! $operation->bank_account_id) throw ValidationException::withMessages(['bank_account_id' => 'Sélectionnez le compte bancaire ou portefeuille utilisé.']);
            $account = BankAccount::query()->where('organization_id',$operation->organization_id)->whereKey($operation->bank_account_id)->where('currency',$operation->currency)->where('status','open')->lockForUpdate()->first();
            if (! $account) throw ValidationException::withMessages(['bank_account_id' => 'Le compte sélectionné est invalide pour cette organisation ou cette devise.']);
            if (! $isRevenue) {
                $balance = (float)$account->opening_balance + (float)$account->transactions()->where('status','posted')->where('type','in')->sum('amount') - (float)$account->transactions()->where('status','posted')->where('type','out')->sum('amount');
                if ((float)$operation->amount > $balance) throw ValidationException::withMessages(['amount' => 'Solde bancaire insuffisant pour cette dépense.']);
            }
            BankTransaction::create(['organization_id'=>$operation->organization_id,'bank_account_id'=>$account->id,'created_by'=>$operation->created_by,'project_id'=>$operation->project_id,'type'=>$isRevenue?'in':'out','amount'=>$operation->amount,'transaction_date'=>$isRevenue?$operation->received_date:$operation->expense_date,'reference'=>$operation->payment_reference,'description'=>$operation->description,'status'=>'posted']);
            return;
        }

        throw ValidationException::withMessages(['payment_method_id' => 'Ce mode de paiement ne peut pas encore être relié automatiquement à la caisse ou à la banque.']);
    }
}
