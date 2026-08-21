<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // PostgreSQL uses a CHECK constraint for Laravel enum columns.
        // Remove the old constraint before replacing provider values.
        $constraint = 'payments_provider_check';
        $constraintExists = DB::selectOne(
            "select 1 from pg_constraint where conname = ?",
            [$constraint]
        );

        if ($constraintExists) {
            DB::statement("alter table payments drop constraint {$constraint}");
        }

        DB::table('payments')->where('provider', 'feedapay')->update(['provider' => 'fedapay']);

        DB::statement("alter table payments add constraint {$constraint} check (provider in ('fedapay', 'kkiapay'))");
    }

    public function down(): void
    {
        $constraint = 'payments_provider_check';
        $constraintExists = DB::selectOne(
            "select 1 from pg_constraint where conname = ?",
            [$constraint]
        );

        if ($constraintExists) {
            DB::statement("alter table payments drop constraint {$constraint}");
        }

        // Existing Kkiapay payments cannot safely be converted to a legacy
        // provider, so rollback is intentionally refused when they exist.
        if (DB::table('payments')->where('provider', 'kkiapay')->exists()) {
            throw new \RuntimeException('Impossible de revenir aux anciens fournisseurs : des paiements Kkiapay existent.');
        }

        DB::statement("alter table payments add constraint {$constraint} check (provider in ('feedapay', 'mtn', 'moov', 'orange'))");
    }
};
