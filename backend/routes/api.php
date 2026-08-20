<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OrganizationController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\CashController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\SyncConflictController;
use App\Http\Middleware\AuditTrail;

Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);
Route::get('/auth/invitations/{token}', [AuthController::class, 'showInvitation']);
Route::post('/auth/invitations/{token}/accept', [AuthController::class, 'acceptInvitation']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::get('/organizations', [OrganizationController::class, 'index']);

    Route::middleware(['org.access', AuditTrail::class])->prefix('organizations/{organization}')->group(function () {
        Route::get('/', [OrganizationController::class, 'show']);
        Route::match(['put', 'patch'], '/', [OrganizationController::class, 'update'])->middleware('permission:organizations.manage');
        Route::get('users', [UserController::class, 'index']);
        Route::post('users', [UserController::class, 'store'])->middleware('permission:users.manage');
        Route::match(['put', 'patch'], 'users/{user}', [UserController::class, 'update'])->middleware('permission:users.manage');
        Route::delete('users/{user}', [UserController::class, 'destroy'])->middleware('permission:users.manage');
        Route::get('roles', [RoleController::class, 'index']);
        Route::get('donors', [\App\Http\Controllers\Api\DonorController::class, 'index']);
        Route::post('donors', [\App\Http\Controllers\Api\DonorController::class, 'store'])->middleware('permission:donors.manage');
        Route::match(['put', 'patch'], 'donors/{donor}', [\App\Http\Controllers\Api\DonorController::class, 'update'])->middleware('permission:donors.manage');
        Route::delete('donors/{donor}', [\App\Http\Controllers\Api\DonorController::class, 'destroy'])->middleware('permission:donors.manage');
        Route::get('projects', [\App\Http\Controllers\Api\ProjectController::class, 'index']);
        Route::get('projects/{project}', [\App\Http\Controllers\Api\ProjectController::class, 'show']);
        Route::post('projects', [\App\Http\Controllers\Api\ProjectController::class, 'store'])->middleware('permission:projects.create');
        Route::match(['put', 'patch'], 'projects/{project}', [\App\Http\Controllers\Api\ProjectController::class, 'update'])->middleware('permission:projects.manage');
        Route::delete('projects/{project}', [\App\Http\Controllers\Api\ProjectController::class, 'destroy'])->middleware('permission:projects.manage');
        Route::get('expense-categories', [\App\Http\Controllers\Api\ExpenseCategoryController::class, 'index']);
        Route::post('expense-categories', [\App\Http\Controllers\Api\ExpenseCategoryController::class, 'store'])->middleware('permission:expense_categories.manage');
        Route::match(['put', 'patch'], 'expense-categories/{category}', [\App\Http\Controllers\Api\ExpenseCategoryController::class, 'update'])->middleware('permission:expense_categories.manage');
        Route::delete('expense-categories/{category}', [\App\Http\Controllers\Api\ExpenseCategoryController::class, 'destroy'])->middleware('permission:expense_categories.manage');
        Route::apiResource('projects.budget-lines', \App\Http\Controllers\Api\BudgetLineController::class);
        Route::get('expenses', [\App\Http\Controllers\Api\ExpenseController::class, 'index']);
        Route::get('expenses/{expense}', [\App\Http\Controllers\Api\ExpenseController::class, 'show']);
        Route::post('expenses', [\App\Http\Controllers\Api\ExpenseController::class, 'store'])->middleware('permission:expenses.create');
        Route::match(['put', 'patch'], 'expenses/{expense}', [\App\Http\Controllers\Api\ExpenseController::class, 'update'])->middleware('permission:expenses.create');
        Route::delete('expenses/{expense}', [\App\Http\Controllers\Api\ExpenseController::class, 'destroy'])->middleware('permission:expenses.create');
        Route::post('expenses/{expense}/submit', [\App\Http\Controllers\Api\ExpenseController::class, 'submit'])->middleware('permission:expenses.create');
        Route::post('expenses/{expense}/approve', [\App\Http\Controllers\Api\ExpenseController::class, 'approve'])->middleware('permission:expenses.approve');
        Route::post('expenses/{expense}/reject', [\App\Http\Controllers\Api\ExpenseController::class, 'reject'])->middleware('permission:expenses.approve');
        Route::post('expenses/{expense}/mark-paid', [\App\Http\Controllers\Api\ExpenseController::class, 'markPaid'])->middleware('permission:expenses.approve');
        Route::get('payment-methods', fn () => response()->json(['data' => \App\Models\PaymentMethod::all()]));
        Route::get('revenues', [\App\Http\Controllers\Api\RevenueController::class, 'index']);
        Route::get('revenues/{revenue}', [\App\Http\Controllers\Api\RevenueController::class, 'show']);
        Route::post('revenues', [\App\Http\Controllers\Api\RevenueController::class, 'store'])->middleware('permission:revenues.create');
        Route::match(['put', 'patch'], 'revenues/{revenue}', [\App\Http\Controllers\Api\RevenueController::class, 'update'])->middleware('permission:revenues.create');
        Route::delete('revenues/{revenue}', [\App\Http\Controllers\Api\RevenueController::class, 'destroy'])->middleware('permission:revenues.create');
        Route::post('revenues/{revenue}/submit', [\App\Http\Controllers\Api\RevenueController::class, 'submit'])->middleware('permission:revenues.create');
        Route::post('revenues/{revenue}/approve', [\App\Http\Controllers\Api\RevenueController::class, 'approve'])->middleware('permission:revenues.approve');
        Route::post('revenues/{revenue}/reject', [\App\Http\Controllers\Api\RevenueController::class, 'reject'])->middleware('permission:revenues.approve');
        Route::post('revenues/{revenue}/mark-paid', [\App\Http\Controllers\Api\RevenueController::class, 'markPaid'])->middleware('permission:revenues.approve');
        Route::get('cash-registers', [CashController::class, 'index']);
        Route::post('cash-registers', [CashController::class, 'storeRegister'])->middleware('permission:cash.manage');
        Route::patch('cash-registers/{cashRegister}', [CashController::class, 'updateRegister'])->middleware('permission:cash.manage');
        Route::delete('cash-registers/{cashRegister}', [CashController::class, 'destroyRegister'])->middleware('permission:cash.manage');
        Route::get('cash-registers/{cashRegister}/transactions', [CashController::class, 'transactions']);
        Route::post('cash-registers/{cashRegister}/transactions', [CashController::class, 'storeTransaction'])->middleware('permission:cash.manage');
        Route::get('cash-registers/{cashRegister}/reconciliations', [CashController::class, 'reconciliations']);
        Route::post('cash-registers/{cashRegister}/reconciliations', [CashController::class, 'reconcile'])->middleware('permission:cash.manage');
        Route::get('banks', [\App\Http\Controllers\Api\BankController::class, 'index']);
        Route::post('banks', [\App\Http\Controllers\Api\BankController::class, 'storeAccount'])->middleware('permission:bank.manage');
        Route::match(['put', 'patch'], 'banks/{bankAccount}', [\App\Http\Controllers\Api\BankController::class, 'updateAccount'])->middleware('permission:bank.manage');
        Route::get('banks/{bankAccount}/transactions', [\App\Http\Controllers\Api\BankController::class, 'transactions']);
        Route::post('banks/{bankAccount}/transactions', [\App\Http\Controllers\Api\BankController::class, 'storeTransaction'])->middleware('permission:bank.manage');
        Route::get('banks/{bankAccount}/reconciliations', [\App\Http\Controllers\Api\BankController::class, 'reconciliations']);
        Route::post('banks/{bankAccount}/reconciliations', [\App\Http\Controllers\Api\BankController::class, 'reconcile'])->middleware('permission:bank.manage');
        Route::apiResource('documents', DocumentController::class)->only(['index', 'store', 'show', 'destroy']);
        Route::get('documents/{document}/download', [DocumentController::class, 'download']);
        Route::get('reports', [ReportController::class, 'summary'])->middleware('permission:reports.view');
        Route::post('reports/generate', [ReportController::class, 'summary'])->middleware('permission:reports.export');
        Route::get('audit-logs', [AuditLogController::class, 'index'])->middleware('permission:audit.view');
        Route::get('sync/conflicts', [SyncConflictController::class, 'index']);
        Route::post('sync/conflicts', [SyncConflictController::class, 'store']);
        Route::post('sync/conflicts/{conflict}/resolve', [SyncConflictController::class, 'resolve']);
    });

    Route::prefix('sync')->group(function () {
        Route::post('/upload', fn () => null);
        Route::get('/download', fn () => null);
    });
});
