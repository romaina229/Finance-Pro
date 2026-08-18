<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Revenue extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'organization_id', 'project_id', 'donor_id', 'amount', 'currency', 'amount_in_org_currency',
        'revenue_type', 'received_date', 'payment_method_id', 'cash_register_id', 'bank_account_id',
        'payment_reference', 'description', 'status', 'created_by', 'submitted_at', 'approved_by',
        'approved_at', 'rejection_reason',
    ];

    protected $casts = [
        'amount' => 'decimal:2', 'amount_in_org_currency' => 'decimal:2', 'received_date' => 'date',
        'submitted_at' => 'datetime', 'approved_at' => 'datetime',
    ];

    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function donor(): BelongsTo { return $this->belongsTo(Donor::class); }
    public function paymentMethod(): BelongsTo { return $this->belongsTo(PaymentMethod::class); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function approver(): BelongsTo { return $this->belongsTo(User::class, 'approved_by'); }
    public function cashRegister(): BelongsTo { return $this->belongsTo(CashRegister::class); }
    public function bankAccount(): BelongsTo { return $this->belongsTo(BankAccount::class); }
}
