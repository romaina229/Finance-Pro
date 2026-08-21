<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Génère la facture du mois pour chaque organisation abonnée, le 1er à 1h du matin.
Schedule::command('subscriptions:generate-invoices')->monthlyOn(1, '01:00');
