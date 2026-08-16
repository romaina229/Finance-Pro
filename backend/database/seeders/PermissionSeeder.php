<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            ['code' => 'organizations.manage', 'name' => "Gérer l'organisation",        'module' => 'organizations'],
            ['code' => 'users.manage',         'name' => 'Gérer les utilisateurs',       'module' => 'users'],
            ['code' => 'donors.manage',        'name' => 'Gérer les bailleurs',          'module' => 'projects'],
            ['code' => 'projects.create',      'name' => 'Créer un projet',              'module' => 'projects'],
            ['code' => 'projects.manage',      'name' => 'Gérer les projets',            'module' => 'projects'],
            ['code' => 'expenses.create',      'name' => 'Créer une dépense',            'module' => 'accounting'],
            ['code' => 'expenses.approve',     'name' => 'Approuver une dépense',        'module' => 'accounting'],
            ['code' => 'revenues.create',      'name' => 'Créer une recette',            'module' => 'accounting'],
            ['code' => 'budgets.manage',       'name' => 'Gérer les budgets',            'module' => 'accounting'],
            ['code' => 'reports.view',         'name' => 'Consulter les rapports',       'module' => 'reports'],
            ['code' => 'reports.export',       'name' => 'Exporter les rapports',        'module' => 'reports'],
            ['code' => 'audit.view',           'name' => "Consulter le journal d'audit", 'module' => 'audit'],
        ];

        foreach ($permissions as $permission) {
            DB::table('permissions')->updateOrInsert(['code' => $permission['code']], $permission);
        }

        // Attribution simple de départ : org_admin obtient tout, les autres rôles
        // seront affinés à l'étape "Utilisateurs / rôles / permissions".
        $orgAdminId = DB::table('roles')->where('code', 'org_admin')->value('id');
        $allPermissionIds = DB::table('permissions')->pluck('id');

        foreach ($allPermissionIds as $permissionId) {
            DB::table('role_permissions')->updateOrInsert([
                'role_id' => $orgAdminId,
                'permission_id' => $permissionId,
            ]);
        }
    }
}
