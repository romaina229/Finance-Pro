<?php

namespace App\Models;

use App\Models\BudgetLine;
use App\Models\Donor;
use App\Models\Expense;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'organization_id',
        'donor_id',
        'code',
        'name',
        'description',
        'total_budget',
        'currency',
        'start_date',
        'end_date',
        'status',
        'project_manager_id',
    ];

    protected $casts = [
        'total_budget' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function donor(): BelongsTo
    {
        return $this->belongsTo(Donor::class);
    }

    public function projectManager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'project_manager_id');
    }

    // Relations à activer aux étapes suivantes (Budgets, Dépenses, Recettes)
    public function budgetLines(): HasMany
    {
        return $this->hasMany(BudgetLine::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function revenues(): HasMany
    {
        return $this->hasMany(Revenue::class);
    }
}
