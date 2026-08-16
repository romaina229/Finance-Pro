<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Donor;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class DonorController extends Controller
{
    public function index(Request $request, Organization $organization)
    {
        $donors = $organization->donors()->orderBy('name')->get();

        return response()->json(['data' => $donors]);
    }

    public function store(Request $request, Organization $organization)
    {
        $validator = Validator::make($request->all(), [
            'name'              => ['required', 'string', 'max:255'],
            'donor_type'        => ['nullable', 'string', 'max:50'],
            'country'           => ['nullable', 'string', 'max:100'],
            'contact_name'      => ['nullable', 'string', 'max:150'],
            'contact_email'     => ['nullable', 'email'],
            'default_currency'  => ['nullable', 'string', 'size:3', 'exists:currencies,code'],
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $donor = $organization->donors()->create($validator->validated());

        return response()->json(['data' => $donor], 201);
    }

    public function update(Request $request, Organization $organization, Donor $donor)
    {
        abort_if($donor->organization_id !== $organization->id, 404);

        $validator = Validator::make($request->all(), [
            'name'              => ['sometimes', 'string', 'max:255'],
            'donor_type'        => ['sometimes', 'nullable', 'string', 'max:50'],
            'country'           => ['sometimes', 'nullable', 'string', 'max:100'],
            'contact_name'      => ['sometimes', 'nullable', 'string', 'max:150'],
            'contact_email'     => ['sometimes', 'nullable', 'email'],
            'default_currency'  => ['sometimes', 'string', 'size:3', 'exists:currencies,code'],
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $donor->update($validator->validated());

        return response()->json(['data' => $donor->fresh()]);
    }

    public function destroy(Request $request, Organization $organization, Donor $donor)
    {
        abort_if($donor->organization_id !== $organization->id, 404);

        if ($donor->projects()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer un bailleur lié à des projets existants.',
            ], 422);
        }

        $donor->delete();

        return response()->json(['message' => 'Bailleur supprimé.']);
    }
}
