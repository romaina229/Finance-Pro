<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetLine extends Model
{
    use HasUuids;

    protected $fillable = [
        'organization_id',
        'project_id',
        'category_id',
        'fiscal_year',
        'label',
        'planned_amount',
        'currency',
        'notes',
    ];

    protected $casts = [
        'fiscal_year' => 'integer',
        'planned_amount' => 'decimal:2',
    ];

    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function category(): BelongsTo { return $this->belongsTo(ExpenseCategory::class, 'category_id'); }
}
