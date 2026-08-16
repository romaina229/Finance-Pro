<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Table standard requise par Laravel Sanctum pour l'authentification par jeton API.
// Générée normalement par `php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"`
// — recréée ici pour que le dépôt soit complet sans dépendre de cette commande.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->uuidMorphs('tokenable');   // supporte tokenable_id en UUID (nos users)
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
    }
};
