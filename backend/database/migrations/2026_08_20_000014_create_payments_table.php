<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('invoice_id');
            $table->uuid('organization_id');
            $table->enum('provider', ['fedapay', 'kkiapay']);
            $table->string('provider_transaction_id')->nullable(); // renseigné à la confirmation opérateur
            $table->string('phone_number', 20);
            $table->decimal('amount', 18, 2);
            $table->char('currency', 3)->default('XOF');
            $table->enum('status', ['pending', 'confirmed', 'failed'])->default('pending');
            $table->json('raw_payload')->nullable(); // réponse brute de l'opérateur, pour audit/litige
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();

            $table->foreign('invoice_id')->references('id')->on('invoices')->cascadeOnDelete();
            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->index(['provider', 'provider_transaction_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
