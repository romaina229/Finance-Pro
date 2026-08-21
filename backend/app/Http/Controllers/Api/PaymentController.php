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

    public function initiate(Request $request, Organization $organization, Invoice $invoice)
    {
        abort_if($invoice->organization_id !== $organization->id, 404);

        if ($invoice->status !== 'pending') {
            return response()->json(['message' => 'Cette facture n’est plus en attente de paiement.'], 422);
        }

        $validator = Validator::make($request->all(), [
            'provider' => ['required', 'in:fedapay,kkiapay'],
            'phone_number' => ['required', 'string', 'max:20'],
        ]);
        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $provider = (string) $request->input('provider');
        $phoneNumber = (string) $request->input('phone_number');

        // Réutilise une tentative encore en attente pour éviter de créer
        // plusieurs paiements concurrents pour la même facture.
        $payment = Payment::where('invoice_id', $invoice->id)
            ->where('organization_id', $organization->id)
            ->where('provider', $provider)
            ->where('status', 'pending')
            ->latest('created_at')
            ->first();

        if ($payment) {
            $payment->update(['phone_number' => $phoneNumber]);
        } else {
            $payment = Payment::create([
                'invoice_id' => $invoice->id,
                'organization_id' => $organization->id,
                'provider' => $provider,
                'phone_number' => $phoneNumber,
                'amount' => $invoice->amount,
                'currency' => $invoice->currency,
                'status' => 'pending',
            ]);
        }

        try {
            $result = $this->gateways->driver($provider)->initiate($payment, $phoneNumber);
            $payment->update([
                'provider_transaction_id' => $result['provider_transaction_id'] ?? $payment->provider_transaction_id,
                'raw_payload' => $result['raw'] ?? null,
            ]);

            $checkoutUrl = $result['checkout_url'] ?? null;
            $widgetConfig = $checkoutUrl ? null : ($result['raw'] ?? null);

            return response()->json([
                'data' => $payment->fresh(),
                'checkout_url' => $checkoutUrl,
                'widget' => $widgetConfig,
                'message' => $checkoutUrl
                    ? 'Finalisez le paiement sur la page ouverte.'
                    : 'Finalisez le paiement dans la fenêtre qui va s’ouvrir.',
            ], 201);
        } catch (\Throwable $e) {
            $payment->update(['status' => 'failed']);
            Log::error('Paiement forfait : échec initiation', ['provider' => $provider, 'error' => $e->getMessage()]);

            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function confirmKkiapay(Request $request, Organization $organization, Invoice $invoice, Payment $payment)
    {
        abort_if($invoice->organization_id !== $organization->id, 404);
        abort_if($payment->invoice_id !== $invoice->id || $payment->organization_id !== $organization->id, 404);
        abort_if($payment->provider !== 'kkiapay', 422, 'Cet endpoint est réservé aux paiements Kkiapay.');

        if ($invoice->status !== 'pending' || $payment->status === 'confirmed') {
            return response()->json(['message' => 'Cette facture est déjà traitée ou n’est plus payable.'], 422);
        }

        $validator = Validator::make($request->all(), [
            'transaction_id' => ['required', 'string', 'max:255'],
        ]);
        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        try {
            /** @var \App\Services\Payments\KkiapayDriver $driver */
            $driver = $this->gateways->driver('kkiapay');
            $result = $driver->confirmTransaction($request->string('transaction_id')->toString(), $payment);

            if ($result['status'] !== 'confirmed') {
                $payment->update([
                    'provider_transaction_id' => $result['provider_transaction_id'],
                    'status' => 'failed',
                    'raw_payload' => $result['raw'],
                ]);

                return response()->json(['message' => 'Le paiement Kkiapay n’a pas été confirmé.'], 422);
            }

            DB::transaction(function () use ($payment, $invoice, $result) {
                $payment->update([
                    'provider_transaction_id' => $result['provider_transaction_id'],
                    'status' => 'confirmed',
                    'raw_payload' => $result['raw'],
                    'confirmed_at' => now(),
                ]);

                $invoice->update(['status' => 'paid', 'paid_at' => now()]);
            });

            return response()->json([
                'data' => $payment->fresh(),
                'message' => 'Paiement confirmé, merci !',
            ]);
        } catch (\Throwable $e) {
            Log::error('Paiement forfait : échec confirmation Kkiapay', ['payment_id' => $payment->id, 'error' => $e->getMessage()]);

            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function webhook(Request $request, string $provider)
    {
        if (! in_array($provider, ['fedapay', 'kkiapay'], true)) {
            return response()->json(['message' => 'Fournisseur de paiement inconnu.'], 404);
        }

        $driver = $this->gateways->driver($provider);

        if (! $driver->verifyWebhookSignature($request)) {
            Log::warning('Webhook paiement : signature invalide', ['provider' => $provider]);
            return response()->json(['message' => 'Signature invalide.'], 401);
        }

        $parsed = $driver->parseWebhookPayload($request);
        if (empty($parsed['provider_transaction_id'])) {
            return response()->json(['message' => 'Identifiant de transaction manquant.'], 422);
        }

        $payment = Payment::where('provider', $provider)
            ->where('provider_transaction_id', $parsed['provider_transaction_id'])
            ->first();

        if (! $payment) {
            Log::warning('Webhook paiement : transaction inconnue', ['provider' => $provider, 'parsed' => $parsed]);
            return response()->json(['message' => 'Transaction inconnue.'], 404);
        }

        // Une confirmation ne doit jamais être rétrogradée par un événement
        // d'échec reçu ensuite ou par un retry mal ordonné.
        if ($payment->status === 'confirmed' && $parsed['status'] !== 'confirmed') {
            return response()->json(['message' => 'ok']);
        }

        DB::transaction(function () use ($payment, $parsed) {
            $payment->update([
                'status' => $parsed['status'],
                'raw_payload' => $parsed['raw'],
                'confirmed_at' => $parsed['status'] === 'confirmed' ? ($payment->confirmed_at ?? now()) : null,
            ]);

            if ($parsed['status'] === 'confirmed' && $payment->invoice->status === 'pending') {
                $payment->invoice()->update(['status' => 'paid', 'paid_at' => now()]);
            }
        });

        return response()->json(['message' => 'ok']);
    }
}
