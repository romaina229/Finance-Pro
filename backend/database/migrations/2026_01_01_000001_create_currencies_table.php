<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('currencies', function (Blueprint $table) {
            $table->char('code', 3)->primary();   // XOF, EUR, USD
            $table->string('name', 100);
            $table->string('symbol', 10);
        });

        // Devises de départ pour la zone UEMOA et les bailleurs courants
        DB::table('currencies')->insert([
            ['code' => 'XOF', 'name' => 'Franc CFA (UEMOA)', 'symbol' => 'FCFA'],
            ['code' => 'EUR', 'name' => 'Euro', 'symbol' => '€'],
            ['code' => 'USD', 'name' => 'Dollar américain', 'symbol' => '$'],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('currencies');
    }
};
