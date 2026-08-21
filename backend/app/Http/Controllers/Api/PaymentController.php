<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\Payment;
use App\Services\Payments\PaymentGatewayManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class PaymentController extends Controller
{
    public function __construct(private PaymentGatewayManager $gateways) {}

    /**
     * Liste les factures de l'organisation (payées et en attente).
     */
    public function invoices(Request $request, Organization $organization)
    {
        $invoices = $organization->invoices()->with('payments')->orderByDesc('due_date')->get()
            ->map(fn (Invoice $invoice) => [
                'id' => $invoice->id,
                'period_label' => $invoice->period_label,
                'amount' => (float) $invoice->amount,
                'currency' => $invoice->currency,
                'due_date' => $invoice->due_date->toDateString(),
                'status' => $invoice->status,
                'is_overdue' => $invoice->isOverdue(),
                'paid_at' => $invoice->paid_at,
            ]);

        return response()->json(['data' => $invoices]);
    }

    /**
     * Démarre un paiement Mobile Money pour une facture en attente.
     * provider = 'feedapay' (recommandé) | 'mtn' | 'moov' | 'orange'
     */
    public function initiate(Request $request, Organization $organization, Invoice $invoice)
    {
        abort_if($invoice->organization_id !== $organization->id, 404);

        if ($invoice->status !== 'pending') {
            return response()->json(['message' => 'Cette facture n’est plus en attente de paiement.'], 422);
        }

        $validator = Validator::make($request->all(), [
            'provider' => ['required', 'in:feedapay,mtn,moov,orange'],
            'phone_number' => ['required', 'string', 'max:20'],
        ]);
        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $payment = Payment::create([
            'invoice_id' => $invoice->id,
            'organization_id' => $organization->id,
            'provider' => $request->provider,
            'phone_number' => $request->phone_number,
            'amount' => $invoice->amount,
            'currency' => $invoice->currency,
            'status' => 'pending',
        ]);

        try {
            $result = $this->gateways->driver($request->provider)->initiate($payment, $request->phone_number);
            $payment->update([
                'provider_transaction_id' => $result['provider_transaction_id'] ?? null,
                'raw_payload' => $result['raw'] ?? null,
            ]);

            return response()->json([
                'data' => $payment->fresh(),
                'checkout_url' => $result['checkout_url'] ?? null,
                'message' => $result['checkout_url']
                    ? 'Finalisez le paiement sur la page ouverte.'
                    : 'Une demande de paiement a été envoyée sur ce numéro — validez-la sur votre téléphone.',
            ], 201);
        } catch (\Throwable $e) {
            $payment->update(['status' => 'failed']);
            Log::error('Paiement forfait : échec initiation', ['provider' => $request->provider, 'error' => $e->getMessage()]);

            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Webhook de confirmation, un endpoint par fournisseur (routes publiques,
     * PAS de middleware auth:sanctum — l'authenticité est vérifiée par la
     * signature propre à chaque fournisseur via verifyWebhookSignature()).
     */
    public function webhook(Request $request, string $provider)
    {
        $driver = $this->gateways->driver($provider);

        if (! $driver->verifyWebhookSignature($request)) {
            Log::warning('Webhook paiement : signature invalide', ['provider' => $provider]);
            return response()->json(['message' => 'Signature invalide.'], 401);
        }

        $parsed = $driver->parseWebhookPayload($request);
        $payment = Payment::where('provider', $provider)
            ->where('provider_transaction_id', $parsed['provider_transaction_id'])
            ->first();

        if (! $payment) {
            Log::warning('Webhook paiement : transaction inconnue', ['provider' => $provider, 'parsed' => $parsed]);
            return response()->json(['message' => 'Transaction inconnue.'], 404);
        }

        DB::transaction(function () use ($payment, $parsed) {
            $payment->update([
                'status' => $parsed['status'],
                'raw_payload' => $parsed['raw'],
                'confirmed_at' => $parsed['status'] === 'confirmed' ? now() : null,
            ]);

            if ($parsed['status'] === 'confirmed') {
                $payment->invoice()->update(['status' => 'paid', 'paid_at' => now()]);
            }
        });

        return response()->json(['message' => 'ok']);
    }
}
