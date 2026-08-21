<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use Illuminate\Console\Command;

/**
 * À programmer dans routes/console.php via le scheduler Laravel, le 1er de
 * chaque mois : Schedule::command('subscriptions:generate-invoices')->monthlyOn(1, '01:00');
 *
 * Génère, pour chaque abonnement actif, la facture du mois en cours
 * (échéance le 5), si elle n'existe pas déjà — idempotent, peut être
 * relancée sans risque de doublon (contrainte unique organization_id+period_label).
 */
class GenerateMonthlyInvoices extends Command
{
    protected $signature = 'subscriptions:generate-invoices';
    protected $description = 'Génère les factures mensuelles (échéance le 5) pour tous les abonnements actifs';

    public function handle(): int
    {
        $periodLabel = now()->format('Y-m');
        $dueDate = now()->day(5)->toDateString();
        $count = 0;

        Subscription::where('status', 'active')->each(function (Subscription $subscription) use ($periodLabel, $dueDate, &$count) {
            $invoice = $subscription->invoices()->firstOrCreate(
                ['organization_id' => $subscription->organization_id, 'period_label' => $periodLabel],
                ['amount' => $subscription->monthly_amount, 'currency' => $subscription->currency, 'due_date' => $dueDate, 'status' => 'pending']
            );

            if ($invoice->wasRecentlyCreated) {
                $count++;
            }
        });

        $this->info("{$count} facture(s) générée(s) pour la période {$periodLabel}.");

        return self::SUCCESS;
    }
}
