<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Http\Request;

/**
 * ⚠️ SQUELETTE NON IMPLÉMENTÉ. Orange Money Web Payment fonctionne par
 * OAuth2 (client_credentials) puis création d'une transaction de paiement
 * avec redirection vers une page Orange. Complétez ce driver une fois vos
 * identifiants Orange Developer Center (merchant key, OAuth client)
 * obtenus. En attendant, utilisez FeedaPay qui agrège déjà Orange Money
 * dans plusieurs pays.
 */
class OrangeMoneyDriver implements PaymentGatewayDriver
{
    public function initiate(Payment $payment, string $phoneNumber): array
    {
        throw new \RuntimeException(
            "Intégration Orange Money directe non implémentée — utilisez FeedaPay, " .
            "ou complétez ce driver avec vos identifiants Orange Developer Center."
        );
    }

    public function verifyWebhookSignature(Request $request): bool
    {
        return false;
    }

    public function parseWebhookPayload(Request $request): array
    {
        return ['provider_transaction_id' => null, 'status' => 'failed', 'raw' => $request->all()];
    }
}
