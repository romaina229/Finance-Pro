<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bank_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('bank_account_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignUuid('project_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 10);
            $table->decimal('amount', 18, 2);
            $table->date('transaction_date');
            $table->string('reference', 100)->nullable();
            $table->text('description')->nullable();
            $table->string('status', 20)->default('posted');
            $table->timestamps();
            $table->index(['bank_account_id', 'transaction_date']);
        });
    }

    public function down(): void { Schema::dropIfExists('bank_transactions'); }
};
