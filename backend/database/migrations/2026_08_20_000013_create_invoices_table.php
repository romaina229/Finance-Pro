<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('subscription_id');
            $table->decimal('amount', 18, 2);
            $table->char('currency', 3)->default('XOF');
            $table->string('period_label', 7); // "2026-09" — le mois facturé
            $table->date('due_date');           // le 5 du mois facturé
            $table->enum('status', ['pending', 'paid', 'canceled'])->default('pending');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('subscription_id')->references('id')->on('subscriptions')->cascadeOnDelete();
            $table->unique(['organization_id', 'period_label']); // une seule facture par ONG et par mois
            $table->index(['organization_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
