<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Jusqu'ici, un membre invité recevait un mot de passe aléatoire que
 * personne ne connaissait jamais (ni lui, ni l'administrateur) : il
 * apparaissait dans la liste des membres mais ne pouvait littéralement
 * pas se connecter. Ce correctif ajoute un vrai jeton d'invitation à
 * usage unique, permettant à la personne invitée de définir elle-même
 * son mot de passe via un lien.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('invitation_token', 64)->nullable()->unique()->after('status');
            $table->timestamp('invitation_expires_at')->nullable()->after('invitation_token');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['invitation_token', 'invitation_expires_at']);
        });
    }
};
