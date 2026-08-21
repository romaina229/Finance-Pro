<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Laravel's PostgreSQL enum is represented by a CHECK constraint.
        $constraint = 'payments_provider_check';
        $constraintExists = DB::selectOne(
            'select 1 from pg_constraint where conname = ?',
            [$constraint]
        );

        if ($constraintExists) {
            DB::statement("alter table payments drop constraint {$constraint}");
        }

        DB::statement("alter table payments add constraint {$constraint} check (provider in ('fedapay', 'kkiapay'))");
    }

    public function down(): void
    {
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
