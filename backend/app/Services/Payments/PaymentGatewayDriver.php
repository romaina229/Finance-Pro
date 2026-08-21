<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Http\Request;

/**
 * Interface commune aux deux agrégateurs de paiement de l'abonnement :
 * FedaPay et Kkiapay. Chaque driver encapsule les particularités de l'API
 * du fournisseur ; le reste de l'application ne connaît que cette interface.
 */
interface PaymentGatewayDriver
{
    /**
     * Démarre un paiement. Retourne au minimum un identifiant fournisseur
     * lorsqu'il est déjà connu, et peut retourner un checkout_url ou une
     * configuration nécessaire à un widget côté client.
     */
    public function initiate(Payment $payment, string $phoneNumber): array;

    /**
     * Vérifie l'authenticité d'un webhook entrant avant de faire confiance
     * à son contenu.
     */
    public function verifyWebhookSignature(Request $request): bool;

    /**
     * Extrait du corps du webhook l'identifiant de transaction et le statut
     * dans un format normalisé.
     */
    public function parseWebhookPayload(Request $request): array;
}
