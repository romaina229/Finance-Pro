<?php

namespace App\Http\Middleware;

use App\Models\Role;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Usage dans les routes : ->middleware('permission:organizations.manage')
 * Doit toujours être placé APRÈS EnsureOrganizationAccess, qui renseigne
 * 'org_role_id' sur la requête.
 */
class EnsurePermission
{
    public function handle(Request $request, Closure $next, string $permissionCode): Response
    {
        $roleId = $request->attributes->get('org_role_id');
        $role = $roleId ? Role::find($roleId) : null;

        if (! $role || ! $role->hasPermission($permissionCode)) {
            return response()->json([
                'message' => "Vous n'avez pas la permission requise ({$permissionCode}) pour cette action.",
            ], 403);
        }

        return $next($request);
    }
}
