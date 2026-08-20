<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            ['code'=>'organizations.manage','name'=>'Gérer l’organisation','module'=>'organizations'],
            ['code'=>'users.manage','name'=>'Gérer les utilisateurs','module'=>'users'],
            ['code'=>'donors.manage','name'=>'Gérer les bailleurs','module'=>'projects'],
            ['code'=>'expense_categories.manage','name'=>'Gérer le plan comptable','module'=>'accounting'],
            ['code'=>'projects.create','name'=>'Créer un projet','module'=>'projects'],
            ['code'=>'projects.manage','name'=>'Gérer les projets','module'=>'projects'],
            ['code'=>'expenses.create','name'=>'Créer une dépense','module'=>'accounting'],
            ['code'=>'expenses.approve','name'=>'Approuver une dépense','module'=>'accounting'],
            ['code'=>'revenues.create','name'=>'Créer une recette','module'=>'accounting'],
            ['code'=>'revenues.approve','name'=>'Approuver une recette','module'=>'accounting'],
            ['code'=>'cash.manage','name'=>'Gérer les caisses','module'=>'accounting'],
            ['code'=>'bank.manage','name'=>'Gérer les comptes bancaires','module'=>'accounting'],
            ['code'=>'budgets.manage','name'=>'Gérer les budgets','module'=>'accounting'],
            ['code'=>'reports.view','name'=>'Consulter les rapports','module'=>'reports'],
            ['code'=>'reports.export','name'=>'Exporter les rapports','module'=>'reports'],
            ['code'=>'audit.view','name'=>"Consulter le journal d'audit",'module'=>'audit'],
        ];
        foreach ($permissions as $permission) DB::table('permissions')->updateOrInsert(['code'=>$permission['code']],$permission);

        // org_admin et super_admin ont toutes les permissions (autorité complète sur l'organisation).
        $fullAccessRoles = DB::table('roles')->whereIn('code', ['org_admin', 'super_admin'])->pluck('id');
        $allPermissionIds = DB::table('permissions')->pluck('id', 'code');

        foreach ($fullAccessRoles as $roleId) {
            foreach ($allPermissionIds as $permissionId) {
                DB::table('role_permissions')->updateOrInsert(['role_id' => $roleId, 'permission_id' => $permissionId]);
            }
        }

        // Les autres rôles n'avaient jusqu'ici AUCUNE permission assignée (seul org_admin
        // fonctionnait réellement) — voici une matrice par défaut cohérente avec la
        // hiérarchie décrite dans RoleSeeder. Personnalisable ensuite par organisation.
        $rolePermissions = [
            'coordinator' => [
                'donors.manage', 'expense_categories.manage', 'projects.create', 'projects.manage',
                'expenses.approve', 'revenues.approve', 'budgets.manage',
                'reports.view', 'reports.export', 'audit.view',
            ],
            'auditor' => [
                'reports.view', 'reports.export', 'audit.view',
            ],
            'project_manager' => [
                'projects.manage', 'expenses.create', 'revenues.create', 'budgets.manage',
                'cash.manage', 'bank.manage', 'reports.view',
            ],
            'accountant' => [
                'expense_categories.manage', 'expenses.create', 'revenues.create',
                'cash.manage', 'bank.manage', 'reports.view', 'reports.export',
            ],
            'field_officer' => [
                'expenses.create', 'revenues.create',
            ],
            'donor_viewer' => [
                'reports.view',
            ],
        ];

        foreach ($rolePermissions as $roleCode => $codes) {
            $roleId = DB::table('roles')->where('code', $roleCode)->value('id');
            if (! $roleId) continue;

            foreach ($codes as $code) {
                if (isset($allPermissionIds[$code])) {
                    DB::table('role_permissions')->updateOrInsert(['role_id' => $roleId, 'permission_id' => $allPermissionIds[$code]]);
                }
            }
        }
    }
}
