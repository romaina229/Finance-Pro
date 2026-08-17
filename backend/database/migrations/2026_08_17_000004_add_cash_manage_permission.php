<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $permissionId = DB::table('permissions')->where('code', 'cash.manage')->value('id');

        if (!$permissionId) {
            $permissionId = (string) str()->uuid();
            DB::table('permissions')->insert([
                'id' => $permissionId,
                'code' => 'cash.manage',
                'name' => 'Gérer la caisse',
                'module' => 'accounting',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $orgAdminId = DB::table('roles')->where('code', 'org_admin')->value('id');

        if ($orgAdminId) {
            DB::table('role_permissions')->updateOrInsert([
                'role_id' => $orgAdminId,
                'permission_id' => $permissionId,
            ], [
                'role_id' => $orgAdminId,
                'permission_id' => $permissionId,
            ]);
        }
    }

    public function down(): void
    {
        $permissionId = DB::table('permissions')->where('code', 'cash.manage')->value('id');

        if ($permissionId) {
            DB::table('role_permissions')->where('permission_id', $permissionId)->delete();
            DB::table('permissions')->where('id', $permissionId)->delete();
        }
    }
};
