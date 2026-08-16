<?php

use Laravel\Sanctum\Sanctum;

return [

    /*
    |--------------------------------------------------------------------------
    | Domaines "stateful"
    |--------------------------------------------------------------------------
    | Domaines depuis lesquels les requêtes seront authentifiées via cookies
    | de session (utile pour frontend-web en dev). Les clients mobile/desktop
    | utilisent des jetons Bearer classiques et ne sont pas concernés ici.
    */
    'stateful' => explode(',', env(
        'SANCTUM_STATEFUL_DOMAINS',
        'localhost,localhost:3000,localhost:5173,127.0.0.1,127.0.0.1:8000,::1'
    )),

    'guard' => ['web'],

    'expiration' => null,   // les jetons n'expirent pas par défaut ; à durcir en production

    'middleware' => [
        'verify_csrf_token' => \App\Http\Middleware\VerifyCsrfToken::class,
        'encrypt_cookies' => \App\Http\Middleware\EncryptCookies::class,
    ],

];
