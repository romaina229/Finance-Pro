<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BankReconciliation extends Model
{
    use HasUuids;
    protected $fillable = ['organization_id','bank_account_id','reconciled_by','reconciliation_date','statement_balance','book_balance','difference','notes'];
    protected $casts = ['reconciliation_date' => 'date', 'statement_balance' => 'decimal:2', 'book_balance' => 'decimal:2', 'difference' => 'decimal:2'];
    public function account(): BelongsTo { return $this->belongsTo(BankAccount::class, 'bank_account_id'); }
    public function reconciler(): BelongsTo { return $this->belongsTo(User::class, 'reconciled_by'); }
}
