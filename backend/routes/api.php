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

        // --- Bailleurs ---
        Route::get('donors', [\App\Http\Controllers\Api\DonorController::class, 'index']);
        Route::post('donors', [\App\Http\Controllers\Api\DonorController::class, 'store'])
            ->middleware('permission:donors.manage');
        Route::match(['put', 'patch'], 'donors/{donor}', [\App\Http\Controllers\Api\DonorController::class, 'update'])
            ->middleware('permission:donors.manage');
        Route::delete('donors/{donor}', [\App\Http\Controllers\Api\DonorController::class, 'destroy'])
            ->middleware('permission:donors.manage');

        // --- Projets ---
        Route::get('projects', [\App\Http\Controllers\Api\ProjectController::class, 'index']);
        Route::get('projects/{project}', [\App\Http\Controllers\Api\ProjectController::class, 'show']);
        Route::post('projects', [\App\Http\Controllers\Api\ProjectController::class, 'store'])
            ->middleware('permission:projects.create');
        Route::match(['put', 'patch'], 'projects/{project}', [\App\Http\Controllers\Api\ProjectController::class, 'update'])
            ->middleware('permission:projects.manage');
        Route::delete('projects/{project}', [\App\Http\Controllers\Api\ProjectController::class, 'destroy'])
            ->middleware('permission:projects.manage');

        // --- Plan comptable ---
        Route::get('expense-categories', [\App\Http\Controllers\Api\ExpenseCategoryController::class, 'index']);
        Route::post('expense-categories', [\App\Http\Controllers\Api\ExpenseCategoryController::class, 'store'])
            ->middleware('permission:expense_categories.manage');
        Route::match(['put', 'patch'], 'expense-categories/{category}', [\App\Http\Controllers\Api\ExpenseCategoryController::class, 'update'])
            ->middleware('permission:expense_categories.manage');
        Route::delete('expense-categories/{category}', [\App\Http\Controllers\Api\ExpenseCategoryController::class, 'destroy'])
            ->middleware('permission:expense_categories.manage');

        // --- Budgets détaillés (étape 11, stub à brancher) ---
        Route::apiResource('projects.budget-lines', \App\Http\Controllers\Api\BudgetLineController::class);

        // --- Dépenses ---
        Route::get('expenses', [\App\Http\Controllers\Api\ExpenseController::class, 'index']);
        Route::get('expenses/{expense}', [\App\Http\Controllers\Api\ExpenseController::class, 'show']);
        Route::post('expenses', [\App\Http\Controllers\Api\ExpenseController::class, 'store'])
            ->middleware('permission:expenses.create');
        Route::match(['put', 'patch'], 'expenses/{expense}', [\App\Http\Controllers\Api\ExpenseController::class, 'update'])
            ->middleware('permission:expenses.create');
        Route::delete('expenses/{expense}', [\App\Http\Controllers\Api\ExpenseController::class, 'destroy'])
            ->middleware('permission:expenses.create');
        Route::post('expenses/{expense}/submit', [\App\Http\Controllers\Api\ExpenseController::class, 'submit'])
            ->middleware('permission:expenses.create');
        Route::post('expenses/{expense}/approve', [\App\Http\Controllers\Api\ExpenseController::class, 'approve'])
            ->middleware('permission:expenses.approve');
        Route::post('expenses/{expense}/reject', [\App\Http\Controllers\Api\ExpenseController::class, 'reject'])
            ->middleware('permission:expenses.approve');
        Route::post('expenses/{expense}/mark-paid', [\App\Http\Controllers\Api\ExpenseController::class, 'markPaid'])
            ->middleware('permission:expenses.approve');

        // --- Référentiel moyens de paiement ---
        Route::get('payment-methods', function () {
            return response()->json(['data' => \App\Models\PaymentMethod::all()]);
        });

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
