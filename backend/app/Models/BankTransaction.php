<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BankTransaction extends Model
{
    use HasUuids;

    protected $fillable = ['organization_id','bank_account_id','created_by','project_id','type','amount','transaction_date','reference','description','status'];
    protected $casts = ['amount' => 'decimal:2', 'transaction_date' => 'date'];
    public function account(): BelongsTo { return $this->belongsTo(BankAccount::class, 'bank_account_id'); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
}
