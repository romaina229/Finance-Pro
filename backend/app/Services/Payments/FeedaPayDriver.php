<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * FeedaPay est un agrégateur de paiement (MTN, Moov, cartes...) courant
 * en Afrique de l'Ouest francophone : UNE SEULE intégration API au lieu
 * de trois comptes marchands séparés par opérateur. C'est l'option
 * recommandée pour démarrer.
 *
 * ⚠️ IMPORTANT : les noms d'endpoints et la forme exacte du payload
 * ci-dessous sont basés sur le schéma habituel de ce type d'API
 * (transaction créée côté serveur, paiement finalisé sur une page
 * hébergée par FeedaPay, confirmation par webhook signé). Ils DOIVENT
 * être vérifiés/ajustés contre la documentation officielle une fois vos
 * identifiants marchands FeedaPay obtenus — impossible de tester contre
 * leur vraie API depuis cet environnement de développement (pas d'accès
 * réseau externe, pas de clé de test).
 */
class FeedaPayDriver implements PaymentGatewayDriver
{
    private string $apiKey;
    private string $webhookSecret;
    private string $baseUrl;

    public function __construct()
    {
        $this->apiKey = (string) config('services.feedapay.api_key');
        $this->webhookSecret = (string) config('services.feedapay.webhook_secret');
        $this->baseUrl = (string) config('services.feedapay.base_url', 'https://api.feedapay.com/v1');
    }

    public function initiate(Payment $payment, string $phoneNumber): array
    {
        $response = Http::withToken($this->apiKey)
            ->post("{$this->baseUrl}/transactions", [
                'amount' => (int) $payment->amount,
                'currency' => $payment->currency,
                'phone_number' => $phoneNumber,
                'description' => "Forfait ONG Finance Pro — facture {$payment->invoice_id}",
                'reference' => $payment->id,
                'callback_url' => config('app.url') . '/api/payments/webhooks/feedapay',
                'return_url' => config('app.frontend_url', config('app.url')) . '/billing?payment=' . $payment->id,
            ]);

        if ($response->failed()) {
            Log::error('FeedaPay: échec de l’initiation du paiement', ['response' => $response->body()]);
            throw new \RuntimeException("Impossible de démarrer le paiement FeedaPay pour le moment.");
        }

        $data = $response->json();

        return [
            'provider_transaction_id' => $data['id'] ?? $data['transaction_id'] ?? null,
            'checkout_url' => $data['checkout_url'] ?? $data['payment_url'] ?? null,
            'raw' => $data,
        ];
    }

    public function verifyWebhookSignature(Request $request): bool
    {
        $signature = $request->header('X-Feedapay-Signature', '');
        $expected = hash_hmac('sha256', $request->getContent(), $this->webhookSecret);

        return hash_equals($expected, $signature);
    }

    public function parseWebhookPayload(Request $request): array
    {
        $payload = $request->json()->all();
        $status = $payload['status'] ?? $payload['event'] ?? '';

        return [
            'provider_transaction_id' => $payload['id'] ?? $payload['transaction_id'] ?? null,
            'status' => in_array($status, ['approved', 'success', 'completed'], true) ? 'confirmed' : 'failed',
            'raw' => $payload,
        ];
    }
}
