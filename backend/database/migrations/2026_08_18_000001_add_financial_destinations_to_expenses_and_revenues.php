<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->uuid('cash_register_id')->nullable()->after('payment_method_id');
            $table->uuid('bank_account_id')->nullable()->after('cash_register_id');
            $table->foreign('cash_register_id')->references('id')->on('cash_registers')->nullOnDelete();
            $table->foreign('bank_account_id')->references('id')->on('bank_accounts')->nullOnDelete();
        });

        Schema::table('revenues', function (Blueprint $table) {
            $table->uuid('cash_register_id')->nullable()->after('payment_method_id');
            $table->uuid('bank_account_id')->nullable()->after('cash_register_id');
            $table->foreign('cash_register_id')->references('id')->on('cash_registers')->nullOnDelete();
            $table->foreign('bank_account_id')->references('id')->on('bank_accounts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropForeign(['cash_register_id']);
            $table->dropForeign(['bank_account_id']);
            $table->dropColumn(['cash_register_id', 'bank_account_id']);
        });

        Schema::table('revenues', function (Blueprint $table) {
            $table->dropForeign(['cash_register_id']);
            $table->dropForeign(['bank_account_id']);
            $table->dropColumn(['cash_register_id', 'bank_account_id']);
        });
    }
};
