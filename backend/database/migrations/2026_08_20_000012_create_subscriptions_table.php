<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->unique(); // un seul abonnement actif par organisation
            $table->decimal('monthly_amount', 18, 2)->default(7500); // forfait ONG Finance Pro, en XOF
            $table->char('currency', 3)->default('XOF');
            $table->enum('status', ['active', 'canceled'])->default('active');
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('currency')->references('code')->on('currencies');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
