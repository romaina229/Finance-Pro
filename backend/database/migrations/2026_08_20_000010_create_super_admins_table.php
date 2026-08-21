<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Compte Super Admin totalement séparé du système multi-organisation :
 * pas de ligne dans user_organizations, pas de rôle applicatif — un
 * super admin n'appartient à aucune ONG, il supervise la plateforme
 * entière. Table et guard d'authentification dédiés (voir config/auth.php
 * et AuthServiceProvider) pour qu'un jeton Sanctum de super admin ne
 * puisse jamais être confondu avec celui d'un utilisateur d'organisation.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('super_admins', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('email')->unique();
            $table->string('password');
            $table->timestamp('last_login_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('super_admins');
    }
};
