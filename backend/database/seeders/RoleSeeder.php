<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['code' => 'super_admin',     'name' => 'Super administrateur plateforme',      'hierarchy_level' => 100],
            ['code' => 'org_admin',       'name' => 'Administrateur ONG',                   'hierarchy_level' => 90],
            ['code' => 'coordinator',     'name' => 'Coordinateur national',                'hierarchy_level' => 80],
            ['code' => 'auditor',         'name' => 'Auditeur / Commissaire aux comptes',   'hierarchy_level' => 70],
            ['code' => 'project_manager', 'name' => 'Chef de projet',                       'hierarchy_level' => 60],
            ['code' => 'accountant',      'name' => 'Comptable',                            'hierarchy_level' => 50],
            ['code' => 'field_officer',   'name' => 'Agent terrain',                        'hierarchy_level' => 20],
            ['code' => 'donor_viewer',    'name' => 'Bailleur (lecture seule)',              'hierarchy_level' => 10],
        ];

        foreach ($roles as $role) {
            DB::table('roles')->updateOrInsert(['code' => $role['code']], $role);
        }
    }
}
