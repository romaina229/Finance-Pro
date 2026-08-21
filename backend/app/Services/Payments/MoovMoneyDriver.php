<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Http\Request;

/**
 * ⚠️ SQUELETTE NON IMPLÉMENTÉ. L'API Moov Money varie selon le pays et
 * l'intégrateur retenu (souvent via un partenaire technique local plutôt
 * qu'une API publique unique comme MTN). Complétez ce driver une fois
 * votre contrat marchand Moov Africa signé et leur documentation
 * d'intégration en main. En attendant, utilisez fedapay qui agrège déjà
 * Moov Money dans plusieurs pays d'Afrique de l'Ouest.
 */
class MoovMoneyDriver implements PaymentGatewayDriver
{
    public function initiate(Payment $payment, string $phoneNumber): array
    {
        throw new \RuntimeException(
            "Intégration Moov Money directe non implémentée — utilisez fedapay, " .
            "ou complétez ce driver avec la documentation fournie par votre contrat marchand Moov Africa."
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
