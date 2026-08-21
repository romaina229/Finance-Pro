<?php

namespace App\Services\Payments;

class PaymentGatewayManager
{
    public function driver(string $provider): PaymentGatewayDriver
    {
        return match ($provider) {
            'feedapay' => new FeedaPayDriver(),
            'mtn' => new MtnMomoDriver(),
            'moov' => new MoovMoneyDriver(),
            'orange' => new OrangeMoneyDriver(),
            default => throw new \InvalidArgumentException("Fournisseur de paiement inconnu : {$provider}"),
        };
    }
}
