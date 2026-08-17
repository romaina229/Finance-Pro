<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SyncConflict extends Model
{
    use HasUuids;

    protected $fillable = [
        'organization_id', 'user_id', 'mutation_id', 'method', 'url',
        'local_payload', 'server_payload', 'status', 'resolved_at', 'resolved_by',
    ];

    protected $casts = [
        'local_payload' => 'array',
        'server_payload' => 'array',
        'resolved_at' => 'datetime',
    ];

    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
