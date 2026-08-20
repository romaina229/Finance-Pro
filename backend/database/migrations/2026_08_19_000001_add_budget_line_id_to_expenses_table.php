<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Jusqu'ici, une dépense n'était rattachée qu'à un projet (organization_id +
 * project_id), jamais à une ligne budgétaire précise. Le suivi de
 * consommation dans BudgetLineController était donc forcément global au
 * projet, incapable de dire "combien a été dépensé sur la ligne Transport"
 * précisément — malgré une UI qui présentait des lignes budgétaires détaillées.
 *
 * Ce correctif ajoute le lien manquant, en gardant la colonne NULLABLE :
 * une dépense peut rester "non affectée" à une ligne budgétaire précise
 * (comportement historique préservé, aucune dépense existante n'est cassée).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->uuid('budget_line_id')->nullable()->after('category_id');
            $table->foreign('budget_line_id')->references('id')->on('budget_lines')->nullOnDelete();
            $table->index('budget_line_id');
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropForeign(['budget_line_id']);
            $table->dropColumn('budget_line_id');
        });
    }
};
