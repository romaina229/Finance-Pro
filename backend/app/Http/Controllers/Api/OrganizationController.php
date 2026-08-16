<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class OrganizationController extends Controller
{
    /**
     * Liste des organisations auxquelles l'utilisateur connecté appartient.
     */
    public function index(Request $request)
    {
        $organizations = $request->user()
            ->organizations()
            ->withPivot(['role_id', 'is_primary', 'status'])
            ->get();

        return response()->json(['data' => $organizations]);
    }

    /**
     * Détail d'une organisation. $organization est déjà résolue et vérifiée
     * par le middleware org.access (voir routes/api.php).
     */
    public function show(Request $request, Organization $organization)
    {
        return response()->json(['data' => $organization]);
    }

    /**
     * Mise à jour des informations de l'organisation.
     * Protégée par le middleware permission:organizations.manage.
     */
    public function update(Request $request, Organization $organization)
    {
        $validator = Validator::make($request->all(), [
            'name'                     => ['sometimes', 'string', 'max:255'],
            'acronym'                  => ['sometimes', 'nullable', 'string', 'max:50'],
            'legal_status'             => ['sometimes', 'nullable', 'string', 'max:100'],
            'registration_number'      => ['sometimes', 'nullable', 'string', 'max:100'],
            'country'                  => ['sometimes', 'string', 'max:100'],
            'city'                     => ['sometimes', 'nullable', 'string', 'max:100'],
            'address'                  => ['sometimes', 'nullable', 'string'],
            'default_currency'         => ['sometimes', 'string', 'size:3', 'exists:currencies,code'],
            'fiscal_year_start_month'  => ['sometimes', 'integer', 'between:1,12'],
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $organization->update($validator->validated());

        return response()->json(['data' => $organization->fresh()]);
    }
}
