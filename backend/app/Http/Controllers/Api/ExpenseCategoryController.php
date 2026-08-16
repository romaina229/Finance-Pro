<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExpenseCategory;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class ExpenseCategoryController extends Controller
{
    /**
     * Retourne le plan comptable applicable à l'organisation :
     * le modèle global (organization_id NULL) + les catégories
     * personnalisées propres à cette ONG.
     */
    public function index(Request $request, Organization $organization)
    {
        $categories = ExpenseCategory::where('organization_id', $organization->id)
            ->orWhereNull('organization_id')
            ->orderBy('code')
            ->get();

        return response()->json(['data' => $categories]);
    }

    /**
     * Ajoute une catégorie personnalisée à l'organisation.
     * Peut être rattachée à une catégorie globale existante (parent_id).
     */
    public function store(Request $request, Organization $organization)
    {
        $validator = Validator::make($request->all(), [
            'parent_id' => ['nullable', 'uuid', 'exists:expense_categories,id'],
            'code'      => ['nullable', 'string', 'max:20'],
            'name'      => ['required', 'string', 'max:150'],
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $category = ExpenseCategory::create([
            ...$validator->validated(),
            'organization_id' => $organization->id,
        ]);

        return response()->json(['data' => $category], 201);
    }

    public function update(Request $request, Organization $organization, ExpenseCategory $category)
    {
        // On ne peut modifier que les catégories propres à l'organisation,
        // jamais le modèle global partagé par toutes les ONG.
        abort_if($category->organization_id !== $organization->id, 403,
            'Cette catégorie fait partie du modèle global et ne peut pas être modifiée.');

        $validator = Validator::make($request->all(), [
            'name' => ['sometimes', 'string', 'max:150'],
            'code' => ['sometimes', 'nullable', 'string', 'max:20'],
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $category->update($validator->validated());

        return response()->json(['data' => $category->fresh()]);
    }

    public function destroy(Request $request, Organization $organization, ExpenseCategory $category)
    {
        abort_if($category->organization_id !== $organization->id, 403,
            'Cette catégorie fait partie du modèle global et ne peut pas être supprimée.');

        if ($category->children()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer une catégorie qui a des sous-catégories.',
            ], 422);
        }

        $category->delete();

        return response()->json(['message' => 'Catégorie supprimée.']);
    }
}
