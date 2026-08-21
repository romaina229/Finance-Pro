<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FedaPayDriver implements PaymentGatewayDriver
{
    private string $secretKey;
    private string $webhookSecret;
    private string $baseUrl;

    public function __construct()
    {
        $this->secretKey = (string) config('services.fedapay.secret_key');
        $this->webhookSecret = (string) config('services.fedapay.webhook_secret');
        $this->baseUrl = config('services.fedapay.environment', 'sandbox') === 'live'
            ? 'https://api.fedapay.com/v1'
            : 'https://sandbox-api.fedapay.com/v1';
    }

    public function initiate(Payment $payment, string $phoneNumber): array
    {
        if ($this->secretKey === '') {
            throw new \RuntimeException('FedaPay n’est pas configuré : FEDAPAY_SECRET_KEY est manquante.');
        }

        $user = request()->user();
        $fullName = trim((string) ($user?->full_name ?? $payment->organization?->name ?? 'Finance Pro'));
        $parts = preg_split('/\s+/', $fullName, 2);
        $firstname = $parts[0] ?? 'Finance';
        $lastname = $parts[1] ?? 'Pro';

        $response = Http::withToken($this->secretKey)
            ->acceptJson()
            ->post("{$this->baseUrl}/transactions", [
                'description' => "Forfait Finance Pro — facture {$payment->invoice_id}",
                'amount' => (int) round((float) $payment->amount),
                'currency' => ['iso' => $payment->currency],
                'customer' => [
                    'firstname' => $firstname,
                    'lastname' => $lastname,
                    'email' => $user?->email,
                    'phone_number' => [
                        'number' => $phoneNumber,
                        'country' => 'bj',
                    ],
                ],
            ]);

        if ($response->failed()) {
            Log::error('FedaPay : échec création transaction', ['response' => $response->body()]);
            throw new \RuntimeException('Impossible de démarrer le paiement FedaPay pour le moment.');
        }

        $transaction = $response->json('v1/transaction') ?? $response->json('transaction') ?? $response->json();
        $transactionId = $transaction['id'] ?? null;
        if (! $transactionId) {
            throw new \RuntimeException('Réponse FedaPay inattendue : identifiant de transaction absent.');
        }

        $tokenResponse = Http::withToken($this->secretKey)
            ->acceptJson()
            ->post("{$this->baseUrl}/transactions/{$transactionId}/token");

        if ($tokenResponse->failed()) {
            Log::error('FedaPay : échec génération token', ['response' => $tokenResponse->body()]);
            throw new \RuntimeException('Impossible de générer le lien de paiement FedaPay.');
        }

        $token = $tokenResponse->json('v1/token') ?? $tokenResponse->json('token') ?? $tokenResponse->json();
        $checkoutUrl = $token['url'] ?? null;
        if (! $checkoutUrl) {
            throw new \RuntimeException('Réponse FedaPay inattendue : URL de paiement absente.');
        }

        return [
            'provider_transaction_id' => (string) $transactionId,
            'checkout_url' => $checkoutUrl,
            'raw' => ['transaction' => $transaction, 'token' => $token],
        ];
    }

    public function verifyWebhookSignature(Request $request): bool
    {
        if ($this->webhookSecret === '') {
            return false;
        }

        $signature = trim((string) $request->header('X-FEDAPAY-SIGNATURE', ''));
        if ($signature === '') {
            return false;
        }

        $expected = hash_hmac('sha256', $request->getContent(), $this->webhookSecret);
        return hash_equals($expected, $signature);
    }

    public function parseWebhookPayload(Request $request): array
    {
        $payload = $request->json()->all();
        $eventName = (string) ($payload['name'] ?? $payload['event'] ?? '');
        $entity = $payload['entity'] ?? $payload['object'] ?? $payload;
        $status = (string) ($entity['status'] ?? '');

        return [
            'provider_transaction_id' => isset($entity['id']) ? (string) $entity['id'] : null,
            'status' => str_contains($eventName, 'approved') || $status === 'approved' ? 'confirmed' : 'failed',
            'raw' => $payload,
        ];
    }
}
