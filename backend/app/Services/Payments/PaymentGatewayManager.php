<?php

namespace App\Services\Payments;

class PaymentGatewayManager
{
    public function driver(string $provider): PaymentGatewayDriver
    {
        return match ($provider) {
            'fedapay' => new FedaPayDriver(),
            'kkiapay' => new KkiapayDriver(),
            default => throw new \InvalidArgumentException("Fournisseur de paiement inconnu : {$provider}"),
        };
    }
}
