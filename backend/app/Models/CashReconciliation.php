<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashReconciliation extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'cash_register_id',
        'organization_id',
        'reconciled_by',
        'reconciliation_date',
        'theoretical_balance',
        'physical_balance',
        'difference',
        'notes',
    ];

    protected $casts = [
        'reconciliation_date' => 'date',
        'theoretical_balance' => 'decimal:2',
        'physical_balance' => 'decimal:2',
        'difference' => 'decimal:2',
    ];

    public function cashRegister(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function reconciler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reconciled_by');
    }
}
