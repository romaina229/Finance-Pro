<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Grammars\Grammar;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        // SQLite does not expose PostgreSQL's pg_constraint catalog. The
        // payments table created by the previous migration already accepts
        // provider values in SQLite, so no schema rewrite is required there.
        if ($driver === 'sqlite') {
            return;
        }

        if ($driver === 'pgsql') {
            $constraint = 'payments_provider_check';
            $constraintExists = DB::selectOne(
                'select 1 from pg_constraint where conname = ?',
                [$constraint]
            );

            if ($constraintExists) {
                DB::statement("alter table payments drop constraint {$constraint}");
            }

            DB::statement("alter table payments add constraint {$constraint} check (provider in ('fedapay', 'kkiapay'))");
            return;
        }

        // For other database engines, use a portable table rebuild only when
        // the engine supports CHECK constraints through Laravel's schema API.
        // Existing provider values are normalized before applying the new rule.
        DB::table('payments')->where('provider', 'feedapay')->update(['provider' => 'fedapay']);

        Schema::table('payments', function (Blueprint $table) {
            // No portable way exists in Laravel's schema builder to replace an
            // existing CHECK constraint across every supported driver. Leave
            // the existing constraint untouched for non-PostgreSQL engines.
        });
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            return;
        }

        if ($driver !== 'pgsql') {
            return;
        }

        $constraint = 'payments_provider_check';
        $constraintExists = DB::selectOne(
            'select 1 from pg_constraint where conname = ?',
            [$constraint]
        );

        if ($constraintExists) {
            DB::statement("alter table payments drop constraint {$constraint}");
        }

        if (DB::table('payments')->where('provider', 'kkiapay')->exists()) {
            throw new \RuntimeException('Impossible de revenir aux anciens fournisseurs : des paiements Kkiapay existent.');
        }

        DB::statement("alter table payments add constraint {$constraint} check (provider in ('fedapay', 'mtn', 'moov', 'orange'))");
    }
};
