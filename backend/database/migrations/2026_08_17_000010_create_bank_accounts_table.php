<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bank_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->string('code', 50);
            $table->string('name');
            $table->string('bank_name');
            $table->string('account_number')->nullable();
            $table->char('currency', 3);
            $table->decimal('opening_balance', 18, 2)->default(0);
            $table->string('status', 20)->default('open');
            $table->timestamps();
            $table->unique(['organization_id', 'code']);
        });
    }

    public function down(): void { Schema::dropIfExists('bank_accounts'); }
};
