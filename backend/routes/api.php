<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OrganizationController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\RoleController;

/*
|--------------------------------------------------------------------------
| API Routes — ONG Finance Pro
|--------------------------------------------------------------------------
| Toutes les routes sont préfixées /api et protégées par Sanctum,
| sauf /auth/login et /auth/register.
|
| Toute route portant {organization} passe par le middleware org.access
| qui vérifie l'appartenance de l'utilisateur et résout le modèle.
| Les actions sensibles ajoutent en plus permission:<code> qui vérifie
| que le rôle de l'utilisateur dans CETTE organisation a la permission.
*/

// --- Authentification (publique) ---
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {

    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // --- Organisations auxquelles l'utilisateur connecté appartient ---
    Route::get('/organizations', [OrganizationController::class, 'index']);

    Route::middleware('org.access')->prefix('organizations/{organization}')->group(function () {

        // --- Organisation elle-même ---
        Route::get('/', [OrganizationController::class, 'show']);
        Route::match(['put', 'patch'], '/', [OrganizationController::class, 'update'])
            ->middleware('permission:organizations.manage');

        // --- Membres / rôles ---
        Route::get('users', [UserController::class, 'index']);
        Route::post('users', [UserController::class, 'store'])
            ->middleware('permission:users.manage');
        Route::match(['put', 'patch'], 'users/{user}', [UserController::class, 'update'])
            ->middleware('permission:users.manage');
        Route::delete('users/{user}', [UserController::class, 'destroy'])
            ->middleware('permission:users.manage');

        Route::get('roles', [RoleController::class, 'index']);

        // --- Projets (étape 5, stubs à brancher) ---
        Route::apiResource('projects', \App\Http\Controllers\Api\ProjectController::class);
        Route::apiResource('projects.budget-lines', \App\Http\Controllers\Api\BudgetLineController::class);

        // --- Comptabilité (étapes 6-8, stubs à brancher) ---
        Route::apiResource('expenses', \App\Http\Controllers\Api\ExpenseController::class);
        Route::post('expenses/{expense}/approve', fn () => null);
        Route::post('expenses/{expense}/reject', fn () => null);

        Route::apiResource('revenues', \App\Http\Controllers\Api\RevenueController::class);

        // --- Mobile Money (stub) ---
        Route::get('mobile-money-transactions', fn () => null);
        Route::post('mobile-money-transactions/{transaction}/reconcile', fn () => null);

        // --- Documents (stub) ---
        Route::apiResource('documents', \App\Http\Controllers\Api\DocumentController::class)
            ->only(['index', 'store', 'show', 'destroy']);

        // --- Rapports (stub) ---
        Route::get('reports', fn () => null);
        Route::post('reports/generate', fn () => null);

        // --- Audit (stub) ---
        Route::get('audit-logs', fn () => null);
    });

    // --- Synchronisation (indépendante d'une organisation unique, voir App\Sync) ---
    Route::prefix('sync')->group(function () {
        Route::post('/upload', fn () => null);
        Route::get('/download', fn () => null);
        Route::post('/conflicts/{conflict}/resolve', fn () => null);
    });
});
