<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('acronym', 50)->nullable();
            $table->string('legal_status', 100)->nullable();
            $table->string('registration_number', 100)->nullable();
            $table->string('country', 100)->default('Bénin');
            $table->string('city', 100)->nullable();
            $table->text('address')->nullable();
            $table->string('logo_path', 500)->nullable();
            $table->char('default_currency', 3)->default('XOF');
            $table->foreign('default_currency')->references('code')->on('currencies');
            $table->unsignedTinyInteger('fiscal_year_start_month')->default(1);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};
