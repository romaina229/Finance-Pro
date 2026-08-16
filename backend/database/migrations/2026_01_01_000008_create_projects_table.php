<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('donor_id')->nullable();
            $table->string('code', 30);                 // ex: PROJ-2026-001
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('total_budget', 18, 2)->default(0);
            $table->char('currency', 3)->default('XOF');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->enum('status', ['draft', 'active', 'suspended', 'closed'])->default('draft');
            $table->uuid('project_manager_id')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('donor_id')->references('id')->on('donors')->nullOnDelete();
            $table->foreign('currency')->references('code')->on('currencies');
            $table->foreign('project_manager_id')->references('id')->on('users')->nullOnDelete();
            $table->unique(['organization_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
