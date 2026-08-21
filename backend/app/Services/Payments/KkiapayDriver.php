<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class KkiapayDriver implements PaymentGatewayDriver
{
    private string $publicKey;
    private string $privateKey;
    private string $secretKey;
    private bool $sandbox;
    private string $webhookSecret;
    private string $baseUrl;

    public function __construct()
    {
        $this->publicKey = (string) config('services.kkiapay.public_key');
        $this->privateKey = (string) config('services.kkiapay.private_key');
        $this->secretKey = (string) config('services.kkiapay.secret_key');
        $this->sandbox = (bool) config('services.kkiapay.sandbox', true);
        $this->webhookSecret = (string) config('services.kkiapay.webhook_secret');
        $this->baseUrl = $this->sandbox ? 'https://api-sandbox.kkiapay.me' : 'https://api.kkiapay.me';
    }

    public function initiate(Payment $payment, string $phoneNumber): array
    {
        if ($this->publicKey === '') {
            throw new \RuntimeException('Kkiapay n’est pas configuré : KKIAPAY_PUBLIC_KEY est manquante.');
        }

        return [
            'provider_transaction_id' => null,
            'checkout_url' => null,
            'raw' => [
                'requires_client_widget' => true,
                'public_key' => $this->publicKey,
                'sandbox' => $this->sandbox,
                'amount' => (int) round((float) $payment->amount),
                // partnerId permet de rattacher la transaction Kkiapay au paiement interne.
                'partner_id' => (string) $payment->id,
            ],
        ];
    }

    public function confirmTransaction(string $transactionId, Payment $payment): array
    {
        if ($this->privateKey === '' || $this->secretKey === '') {
            throw new \RuntimeException('Kkiapay n’est pas configuré : clés privée et secrète requises.');
        }

        $response = Http::acceptJson()
            ->withHeaders([
                'X-API-KEY' => $this->publicKey,
                'X-PRIVATE-KEY' => $this->privateKey,
                'X-SECRET-KEY' => $this->secretKey,
            ])
            ->post("{$this->baseUrl}/api/v1/transactions/status", [
                'transactionId' => $transactionId,
            ]);

        if ($response->failed()) {
            Log::error('Kkiapay : échec vérification transaction', ['response' => $response->body()]);
            throw new \RuntimeException('Impossible de vérifier la transaction Kkiapay.');
        }

        $data = $response->json();
        $status = strtoupper((string) ($data['status'] ?? ''));
        $success = $status === 'SUCCESS';

        if ($success) {
            $returnedAmount = $data['amount'] ?? data_get($data, 'transaction.amount');
            if ($returnedAmount === null || (int) round((float) $returnedAmount) !== (int) round((float) $payment->amount)) {
                throw new \RuntimeException('Le montant confirmé par Kkiapay ne correspond pas au montant de la facture.');
            }

            $partnerId = $data['partnerId'] ?? data_get($data, 'transaction.partnerId');
            if ($partnerId !== null && (string) $partnerId !== (string) $payment->id) {
                throw new \RuntimeException('La transaction Kkiapay ne correspond pas au paiement Finance Pro.');
            }
        }

        return [
            'provider_transaction_id' => $transactionId,
            'status' => $success ? 'confirmed' : 'failed',
            'raw' => $data,
        ];
    }

    public function verifyWebhookSignature(Request $request): bool
    {
        $received = trim((string) $request->header('x-kkiapay-secret', ''));
        return $this->webhookSecret !== '' && hash_equals($this->webhookSecret, $received);
    }

    public function parseWebhookPayload(Request $request): array
    {
        $payload = $request->json()->all();

        return [
            'provider_transaction_id' => $payload['transactionId'] ?? null,
            'status' => ($payload['isPaymentSucces'] ?? false) === true ? 'confirmed' : 'failed',
            'raw' => $payload,
        ];
    }
}
