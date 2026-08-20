<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    protected $fillable = [
        'full_name',
        'email',
        'phone',
        'password',
        'preferred_language',
        'status',
        'invitation_token',
        'invitation_expires_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'invitation_token',
    ];

    protected $casts = [
        'last_login_at' => 'datetime',
        'invitation_expires_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class, 'user_organizations')
            ->withPivot(['role_id', 'is_primary', 'status'])
            ->withTimestamps();
    }

    /**
     * Rôle de l'utilisateur dans une organisation donnée.
     * Utilisé par le middleware d'autorisation pour vérifier les permissions.
     */
    public function roleIn(Organization $organization): ?Role
    {
        $pivot = $this->organizations()
            ->where('organizations.id', $organization->id)
            ->first()?->pivot;

        return $pivot ? Role::find($pivot->role_id) : null;
    }
}
