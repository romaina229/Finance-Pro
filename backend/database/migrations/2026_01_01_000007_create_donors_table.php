<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('donors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->string('name');
            $table->string('donor_type', 50)->nullable();     // bailleur_institutionnel, fondation, etat, particulier
            $table->string('country', 100)->nullable();
            $table->string('contact_name', 150)->nullable();
            $table->string('contact_email')->nullable();
            $table->char('default_currency', 3)->default('XOF');
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('default_currency')->references('code')->on('currencies');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('donors');
    }
};
