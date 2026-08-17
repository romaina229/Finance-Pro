<?php

namespace App\Services;

use App\Models\BankAccount;
use App\Models\BankTransaction;
use App\Models\CashRegister;
use App\Models\CashTransaction;
use App\Models\Expense;
use App\Models\PaymentMethod;
use App\Models\Revenue;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FinancialPostingService
{
    public function postExpense(Expense $expense): void
    {
        DB::transaction(function () use ($expense) {
            $this->post($expense, false);
        });
    }

    public function postRevenue(Revenue $revenue): void
    {
        DB::transaction(function () use ($revenue) {
            $this->post($revenue, true);
        });
    }

    private function post(Expense|Revenue $operation, bool $isRevenue): void
    {
        $operation->loadMissing('paymentMethod');
        $method = $operation->paymentMethod;

        if (! $method) {
            throw ValidationException::withMessages(['payment_method_id' => 'Le mode de paiement est obligatoire.']);
        }

        $isCash = $method->code === 'cash';
        $isBank = in_array($method->code, [
            'bank_transfer',
            'mobile_money_mtn',
            'mobile_money_moov',
            'mobile_money_orange',
        ], true);

        if ($isCash) {
            if (! $operation->cash_register_id) {
                throw ValidationException::withMessages(['cash_register_id' => 'Sélectionnez la caisse utilisée.']);
            }

            $register = CashRegister::query()
                ->where('organization_id', $operation->organization_id)
                ->whereKey($operation->cash_register_id)
                ->where('currency', $operation->currency)
                ->lockForUpdate()
                ->first();

            if (! $register) {
                throw ValidationException::withMessages(['cash_register_id' => 'La caisse sélectionnée est invalide pour cette organisation ou cette devise.']);
            }

            CashTransaction::create([
                'cash_register_id' => $register->id,
                'organization_id' => $operation->organization_id,
                'project_id' => $operation->project_id,
                'created_by' => $operation->created_by,
                'type' => $isRevenue ? 'in' : 'out',
                'amount' => $operation->amount,
                'transaction_date' => $isRevenue ? $operation->received_date : $operation->expense_date,
                'reference' => $operation->payment_reference,
                'description' => $operation->description,
                'status' => 'posted',
            ]);

            return;
        }

        if ($isBank) {
            if (! $operation->bank_account_id) {
                throw ValidationException::withMessages(['bank_account_id' => 'Sélectionnez le compte bancaire ou portefeuille utilisé.']);
            }

            $account = BankAccount::query()
                ->where('organization_id', $operation->organization_id)
                ->whereKey($operation->bank_account_id)
                ->where('currency', $operation->currency)
                ->lockForUpdate()
                ->first();

            if (! $account) {
                throw ValidationException::withMessages(['bank_account_id' => 'Le compte sélectionné est invalide pour cette organisation ou cette devise.']);
            }

            BankTransaction::create([
                'organization_id' => $operation->organization_id,
                'bank_account_id' => $account->id,
                'created_by' => $operation->created_by,
                'project_id' => $operation->project_id,
                'type' => $isRevenue ? 'credit' : 'debit',
                'amount' => $operation->amount,
                'transaction_date' => $isRevenue ? $operation->received_date : $operation->expense_date,
                'reference' => $operation->payment_reference,
                'description' => $operation->description,
                'status' => 'posted',
            ]);

            return;
        }

        throw ValidationException::withMessages([
            'payment_method_id' => 'Ce mode de paiement ne peut pas encore être relié automatiquement à la caisse ou à la banque.',
        ]);
    }
}
