<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — ONG Finance Pro
|--------------------------------------------------------------------------
| Toutes les routes sont préfixées /api et protégées par Sanctum,
| sauf /auth/login et /auth/register.
| Chaque route métier doit résoudre l'organisation courante via un
| middleware (ex: EnsureOrganizationAccess) qui vérifie l'appartenance
| de l'utilisateur à l'organisation demandée.
*/

// --- Authentification ---
Route::post('/auth/login', [\App\Http\Controllers\Api\AuthController::class, 'login']);
Route::post('/auth/register', [\App\Http\Controllers\Api\AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {

    Route::post('/auth/logout', [\App\Http\Controllers\Api\AuthController::class, 'logout']);
    Route::get('/auth/me', [\App\Http\Controllers\Api\AuthController::class, 'me']);

    // --- Organisations ---
    Route::apiResource('organizations', \App\Http\Controllers\Api\OrganizationController::class)
        ->only(['index', 'show', 'update']);

    Route::prefix('organizations/{organization}')->group(function () {

        // --- Utilisateurs / rôles ---
        Route::apiResource('users', \App\Http\Controllers\Api\UserController::class);
        Route::get('roles', fn () => null);

        // --- Projets ---
        Route::apiResource('projects', \App\Http\Controllers\Api\ProjectController::class);
        Route::apiResource('projects.budget-lines', \App\Http\Controllers\Api\BudgetLineController::class);

        // --- Comptabilité ---
        Route::apiResource('expenses', \App\Http\Controllers\Api\ExpenseController::class);
        Route::post('expenses/{expense}/approve', fn () => null);
        Route::post('expenses/{expense}/reject', fn () => null);

        Route::apiResource('revenues', \App\Http\Controllers\Api\RevenueController::class);

        // --- Mobile Money ---
        Route::get('mobile-money-transactions', fn () => null);
        Route::post('mobile-money-transactions/{transaction}/reconcile', fn () => null);

        // --- Documents ---
        Route::apiResource('documents', \App\Http\Controllers\Api\DocumentController::class)
            ->only(['index', 'store', 'show', 'destroy']);

        // --- Rapports ---
        Route::get('reports', fn () => null);
        Route::post('reports/generate', fn () => null);

        // --- Audit ---
        Route::get('audit-logs', fn () => null);
    });

    // --- Synchronisation (voir App\Sync) ---
    Route::prefix('sync')->group(function () {
        Route::post('/upload', fn () => null);     // App\Sync\SyncUploadHandler
        Route::get('/download', fn () => null);     // App\Sync\SyncDownloadHandler
        Route::post('/conflicts/{conflict}/resolve', fn () => null);
    });
});
