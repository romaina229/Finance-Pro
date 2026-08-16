<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('project_id');
            $table->uuid('category_id')->nullable();
            // budget_line_id sera ajouté à l'étape 11 (Budgets), une fois la table budget_lines créée

            $table->decimal('amount', 18, 2);
            $table->char('currency', 3)->default('XOF');
            $table->decimal('amount_in_org_currency', 18, 2)->nullable();

            $table->string('supplier_name')->nullable();
            $table->string('supplier_contact', 150)->nullable();
            $table->foreignId('payment_method_id')->constrained('payment_methods');
            $table->string('payment_reference', 100)->nullable();

            $table->date('expense_date');
            $table->text('description')->nullable();

            $table->enum('status', ['draft', 'pending_approval', 'approved', 'rejected', 'paid'])
                ->default('draft');

            $table->uuid('created_by');
            $table->timestamp('submitted_at')->nullable();
            $table->uuid('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('project_id')->references('id')->on('projects');
            $table->foreign('category_id')->references('id')->on('expense_categories')->nullOnDelete();
            $table->foreign('currency')->references('code')->on('currencies');
            $table->foreign('created_by')->references('id')->on('users');
            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['organization_id', 'status']);
            $table->index(['project_id', 'expense_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
