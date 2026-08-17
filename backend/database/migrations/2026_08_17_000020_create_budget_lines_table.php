<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('budget_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('category_id')->nullable()->constrained('expense_categories')->nullOnDelete();
            $table->unsignedSmallInteger('fiscal_year');
            $table->string('label');
            $table->decimal('planned_amount', 18, 2)->default(0);
            $table->char('currency', 3);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['organization_id', 'project_id', 'fiscal_year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budget_lines');
    }
};
