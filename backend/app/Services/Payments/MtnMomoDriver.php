<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * MTN Mobile Money — Collection API ("Request to Pay").
 *
 * ⚠️ SQUELETTE NON TESTÉ. La structure suit le schéma public de l'API MTN
 * MoMo Collection (X-Reference-Id, Ocp-Apim-Subscription-Key, jeton OAuth
 * via /collection/token/), mais nécessite vos vrais identifiants MTN
 * Developer Portal (Subscription Key + API User/API Key générés sur leur
 * sandbox) pour être activé et testé. Tant que
 * MTN_MOMO_SUBSCRIPTION_KEY n'est pas renseigné dans .env, initiate()
 * refuse explicitement plutôt que d'échouer silencieusement — préférez
 * FeedaPayDriver en attendant, qui couvre déjà MTN via agrégation.
 */
class MtnMomoDriver implements PaymentGatewayDriver
{
    public function initiate(Payment $payment, string $phoneNumber): array
    {
        $subscriptionKey = config('services.mtn_momo.subscription_key');
        if (! $subscriptionKey) {
            throw new \RuntimeException(
                "Intégration MTN Mobile Money directe non configurée (MTN_MOMO_SUBSCRIPTION_KEY manquant). " .
                "Utilisez FeedaPay en attendant, ou complétez ce driver avec vos identifiants MTN Developer Portal."
            );
        }

        $referenceId = (string) Str::uuid();
        $baseUrl = config('services.mtn_momo.base_url', 'https://sandbox.momodeveloper.mtn.com');

        // Étape 1 : jeton OAuth (à mettre en cache, valable ~1h en pratique)
        $tokenResponse = Http::withBasicAuth(config('services.mtn_momo.api_user'), config('services.mtn_momo.api_key'))
            ->withHeaders(['Ocp-Apim-Subscription-Key' => $subscriptionKey])
            ->post("{$baseUrl}/collection/token/");

        if ($tokenResponse->failed()) {
            throw new \RuntimeException('MTN MoMo : échec de l’authentification.');
        }

        $accessToken = $tokenResponse->json('access_token');

        // Étape 2 : Request to Pay
        Http::withToken($accessToken)
            ->withHeaders([
                'X-Reference-Id' => $referenceId,
                'X-Target-Environment' => config('services.mtn_momo.environment', 'sandbox'),
                'Ocp-Apim-Subscription-Key' => $subscriptionKey,
            ])
            ->post("{$baseUrl}/collection/v1_0/requesttopay", [
                'amount' => (string) (int) $payment->amount,
                'currency' => $payment->currency,
                'externalId' => $payment->id,
                'payer' => ['partyIdType' => 'MSISDN', 'partyId' => $phoneNumber],
                'payerMessage' => 'Forfait ONG Finance Pro',
                'payeeNote' => "Facture {$payment->invoice_id}",
            ])
            ->throw();

        return ['provider_transaction_id' => $referenceId, 'checkout_url' => null, 'raw' => ['reference_id' => $referenceId]];
    }

    public function verifyWebhookSignature(Request $request): bool
    {
        // MTN MoMo notifie généralement via un callback URL configuré côté
        // portail développeur plutôt qu'une signature HMAC classique —
        // à sécuriser par un jeton secret dans l'URL de callback une fois
        // l'intégration réelle mise en place.
        return true;
    }

    public function parseWebhookPayload(Request $request): array
    {
        $payload = $request->json()->all();

        return [
            'provider_transaction_id' => $payload['externalId'] ?? $payload['referenceId'] ?? null,
            'status' => ($payload['status'] ?? '') === 'SUCCESSFUL' ? 'confirmed' : 'failed',
            'raw' => $payload,
        ];
    }
}
