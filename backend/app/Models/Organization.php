<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Organization extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'acronym',
        'legal_status',
        'registration_number',
        'country',
        'city',
        'address',
        'logo_path',
        'default_currency',
        'fiscal_year_start_month',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'fiscal_year_start_month' => 'integer',
    ];

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_organizations')
            ->withPivot(['role_id', 'is_primary', 'status'])
            ->withTimestamps();
    }

    public function donors(): HasMany
    {
        return $this->hasMany(Donor::class);
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function revenues(): HasMany
    {
        return $this->hasMany(Revenue::class);
    }

    public function donors(): HasMany
    {
        return $this->hasMany(Donor::class);
    }
}
