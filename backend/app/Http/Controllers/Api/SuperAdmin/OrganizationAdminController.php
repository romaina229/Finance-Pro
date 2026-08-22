<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\Subscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use App\Models\Role;

class OrganizationAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = Organization::query()->withCount(['users', 'projects'])->with('subscription');

        if ($request->filled('approval_status')) {
            $query->where('approval_status', $request->approval_status);
        }
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $organizations = $query->orderByDesc('created_at')->paginate(25);

        $organizations->getCollection()->transform(function (Organization $org) {
            $org->access_blocked_reason = $org->accessBlockedReason();
            return $org;
        });

        return response()->json(['data' => $organizations->items(), 'meta' => [
            'current_page' => $organizations->currentPage(),
            'last_page' => $organizations->lastPage(),
            'total' => $organizations->total(),
        ]]);
    }

    public function show(Request $request, Organization $organization)
    {
        $organization->load([
            'subscription',
            'invoices' => fn ($q) => $q->orderByDesc('due_date'),
            'users' => fn ($q) => $q->wherePivot('is_primary', true),
        ]);

        $organization->users->each(function ($user) {
            $user->role = Role::find($user->pivot->role_id);
        });

        $organization->access_blocked_reason = $organization->accessBlockedReason();

        return response()->json([
            'data' => $organization
        ]);
    }

    /**
     * Valide une organisation : passe approval_status à 'approved' et crée
     * automatiquement son abonnement (7500 XOF/mois) + sa première facture,
     * échéance le 5 du mois en cours si on est avant le 5, sinon le 5 du
     * mois suivant.
     */
    public function approve(Request $request, Organization $organization)
    {
        if ($organization->approval_status === 'approved') {
            return response()->json(['message' => 'Cette organisation est déjà validée.'], 422);
        }

        DB::transaction(function () use ($request, $organization) {
            $organization->update([
                'approval_status' => 'approved',
                'approved_by' => $request->user('super_admin')->id,
                'approved_at' => now(),
                'rejection_reason' => null,
            ]);

            $subscription = Subscription::firstOrCreate(
                ['organization_id' => $organization->id],
                ['monthly_amount' => 7500, 'currency' => 'XOF', 'status' => 'active']
            );

            $dueDate = now()->day <= 5 ? now()->day(5) : now()->addMonthNoOverflow()->day(5);

            $organization->invoices()->firstOrCreate(
                ['period_label' => $dueDate->format('Y-m')],
                ['subscription_id' => $subscription->id, 'amount' => $subscription->monthly_amount, 'currency' => $subscription->currency, 'due_date' => $dueDate->toDateString(), 'status' => 'pending']
            );
        });

        return response()->json(['data' => $organization->fresh(['subscription', 'invoices'])]);
    }

    public function reject(Request $request, Organization $organization)
    {
        $validator = Validator::make($request->all(), [
            'rejection_reason' => ['required', 'string', 'max:500'],
        ]);
        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $organization->update([
            'approval_status' => 'rejected',
            'rejection_reason' => $request->rejection_reason,
            'approved_by' => $request->user('super_admin')->id,
            'approved_at' => now(),
        ]);

        return response()->json(['data' => $organization->fresh()]);
    }

    public function suspend(Request $request, Organization $organization)
    {
        $organization->update(['is_active' => false]);

        return response()->json(['data' => $organization->fresh(), 'message' => 'Organisation suspendue.']);
    }

    public function reactivate(Request $request, Organization $organization)
    {
        $organization->update(['is_active' => true]);

        return response()->json(['data' => $organization->fresh()]);
    }

    /**
     * Tableau de bord Super Admin : vue d'ensemble de la plateforme.
     */
    public function dashboard(Request $request)
    {
        return response()->json(['data' => [
            'organizations' => [
                'total' => Organization::count(),
                'pending' => Organization::where('approval_status', 'pending')->count(),
                'approved' => Organization::where('approval_status', 'approved')->count(),
                'rejected' => Organization::where('approval_status', 'rejected')->count(),
            ],
            'invoices' => [
                'overdue_count' => \App\Models\Invoice::where('status', 'pending')->where('due_date', '<', now()->toDateString())->count(),
                'pending_count' => \App\Models\Invoice::where('status', 'pending')->count(),
                'paid_this_month' => \App\Models\Invoice::where('status', 'paid')->whereYear('paid_at', now()->year)->whereMonth('paid_at', now()->month)->sum('amount'),
            ],
        ]]);
    }
}
