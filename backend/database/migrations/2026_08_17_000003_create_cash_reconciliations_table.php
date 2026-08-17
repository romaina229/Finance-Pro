<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_reconciliations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cash_register_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('reconciled_by')->constrained('users')->restrictOnDelete();
            $table->date('reconciliation_date');
            $table->decimal('theoretical_balance', 18, 2);
            $table->decimal('physical_balance', 18, 2);
            $table->decimal('difference', 18, 2);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['cash_register_id', 'reconciliation_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_reconciliations');
    }
};
