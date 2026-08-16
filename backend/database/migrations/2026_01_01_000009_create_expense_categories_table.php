<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->nullable();   // NULL = modèle global fourni par la plateforme
            $table->uuid('parent_id')->nullable();          // hiérarchie (ex: 62 > 622 > 622100)
            $table->string('code', 20)->nullable();          // code SYSCOHADA, ex: 6221
            $table->string('name', 150);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('parent_id')->references('id')->on('expense_categories')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_categories');
    }
};
