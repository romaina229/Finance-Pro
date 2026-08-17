<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bank_reconciliations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('bank_account_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('reconciled_by')->constrained('users')->restrictOnDelete();
            $table->date('reconciliation_date');
            $table->decimal('statement_balance', 18, 2);
            $table->decimal('book_balance', 18, 2);
            $table->decimal('difference', 18, 2);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['bank_account_id', 'reconciliation_date']);
        });
    }

    public function down(): void { Schema::dropIfExists('bank_reconciliations'); }
};
