<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloque l'accès aux données métier si l'organisation n'est pas validée
 * par le Super Admin, ou si son forfait mensuel est impayé.
 *
 * Volontairement APPLIQUÉ NULLE PART sur les routes /invoices et
 * /invoices/{invoice}/pay : une organisation bloquée pour impayé doit
 * impérativement pouvoir consulter et régler sa facture pour se débloquer
 * elle-même — sinon c'est une impasse totale (voir routes/api.php).
 *
 * Doit toujours être placé APRÈS org.access, qui résout {organization}
 * en véritable modèle Eloquent.
 */
class EnsureOrganizationBilling
{
    public function handle(Request $request, Closure $next): Response
    {
        $organization = $request->route('organization');

        if ($organization instanceof Organization && $reason = $organization->accessBlockedReason()) {
            return response()->json(['message' => $reason, 'access_blocked' => true], 402);
        }

        return $next($request);
    }
}
