<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Vérifie que l'utilisateur authentifié appartient à l'organisation ciblée
 * par le paramètre de route {organization}, et attache son rôle dans cette
 * organisation à la requête (accessible via $request->attributes->get('org_role')).
 *
 * Toute route de la forme /organizations/{organization}/... doit passer par
 * ce middleware — c'est la barrière d'isolation multi-tenant côté application,
 * en complément de organization_id en base.
 */
class EnsureOrganizationAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $organizationId = $request->route('organization');
        $user = $request->user();

        $membership = $user->organizations()
            ->where('organizations.id', $organizationId)
            ->first();

        if (! $membership) {
            return response()->json([
                'message' => "Vous n'avez pas accès à cette organisation.",
            ], 403);
        }

        if ($membership->pivot->status !== 'active') {
            return response()->json([
                'message' => 'Votre accès à cette organisation est suspendu.',
            ], 403);
        }

        // Remplace le paramètre de route (id string) par le vrai modèle chargé,
        // et rend le rôle courant disponible à tous les contrôleurs suivants.
        $request->route()->setParameter('organization', $membership);
        $request->attributes->set('org_role_id', $membership->pivot->role_id);

        return $next($request);
    }
}
