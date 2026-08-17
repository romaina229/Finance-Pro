<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BankAccount extends Model
{
    use HasUuids;

    protected $fillable = ['organization_id','code','name','bank_name','account_number','currency','opening_balance','status'];
    protected $casts = ['opening_balance' => 'decimal:2'];

    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
    public function transactions(): HasMany { return $this->hasMany(BankTransaction::class); }
    public function reconciliations(): HasMany { return $this->hasMany(BankReconciliation::class); }
}
