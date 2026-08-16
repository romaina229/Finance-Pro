<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();   // cash, mobile_money_mtn, mobile_money_moov, bank_transfer...
            $table->string('name', 100);
            $table->boolean('requires_reference')->default(false);
        });

        DB::table('payment_methods')->insert([
            ['code' => 'cash',                'name' => 'Espèces',               'requires_reference' => false],
            ['code' => 'mobile_money_mtn',     'name' => 'MTN Mobile Money',      'requires_reference' => true],
            ['code' => 'mobile_money_moov',    'name' => 'Moov Money',            'requires_reference' => true],
            ['code' => 'mobile_money_orange',  'name' => 'Orange Money',          'requires_reference' => true],
            ['code' => 'bank_transfer',        'name' => 'Virement bancaire',     'requires_reference' => true],
            ['code' => 'cheque',               'name' => 'Chèque',                'requires_reference' => true],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
};
