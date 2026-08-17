<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Document extends Model
{
    use HasUuids;

    protected $fillable = [
        'organization_id', 'uploaded_by', 'original_name', 'disk', 'path',
        'mime_type', 'size', 'documentable_type', 'documentable_id', 'description',
    ];

    protected $casts = ['size' => 'integer'];

    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
    public function uploader(): BelongsTo { return $this->belongsTo(User::class, 'uploaded_by'); }
}
