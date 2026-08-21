<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasUuids;

    protected $fillable = ['invoice_id', 'organization_id', 'provider', 'provider_transaction_id', 'phone_number', 'amount', 'currency', 'status', 'raw_payload', 'confirmed_at'];

    protected $casts = [
        'amount' => 'decimal:2',
        'raw_payload' => 'array',
        'confirmed_at' => 'datetime',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
