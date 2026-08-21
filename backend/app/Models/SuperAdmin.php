<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Compte de supervision de la plateforme entière — n'appartient à aucune
 * organisation (aucune ligne user_organizations), authentification via un
 * guard Sanctum dédié ('super_admin', voir config/auth.php) pour qu'un
 * jeton de super admin ne puisse jamais être utilisé sur les routes
 * /api/organizations/{organization}/... réservées aux comptes classiques,
 * et inversement.
 */
class SuperAdmin extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    protected $fillable = ['full_name', 'email', 'password'];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'last_login_at' => 'datetime',
        'password' => 'hashed',
    ];
}
