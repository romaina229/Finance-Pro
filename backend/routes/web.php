<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'app' => 'ONG Finance Pro API',
        'status' => 'ok',
    ]);
});
