<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Http\Request;

/**
 * Interface commune à FeedaPay (agrégateur, recommandé) et aux opérateurs
 * directs (MTN, Moov, Orange). Chaque driver encapsule les particularités
 * de l'API du fournisseur ; le reste de l'application (PaymentController)
 * ne connaît que cette interface.
 */
interface PaymentGatewayDriver
{
    /**
     * Démarre une transaction de paiement. Retourne un tableau avec au
     * minimum 'provider_transaction_id' et, si le fournisseur fonctionne
     * par redirection (FeedaPay), 'checkout_url'.
     */
    public function initiate(Payment $payment, string $phoneNumber): array;

    /**
     * Vérifie l'authenticité d'un webhook entrant (signature HMAC, jeton
     * secret partagé...) avant de faire confiance à son contenu.
     */
    public function verifyWebhookSignature(Request $request): bool;

    /**
     * Extrait du corps du webhook l'identifiant de transaction et le
     * nouveau statut, dans un format normalisé.
     * Retourne ['provider_transaction_id' => string, 'status' => 'confirmed'|'failed', 'raw' => array]
     */
    public function parseWebhookPayload(Request $request): array;
}
