<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    /**
     * Liste des membres de l'organisation, avec leur rôle et statut.
     */
    public function index(Request $request, Organization $organization)
    {
        $members = $organization->users()
            ->withPivot(['role_id', 'is_primary', 'status'])
            ->get()
            ->map(function (User $user) {
                $role = Role::find($user->pivot->role_id);
                return [
                    'id'         => $user->id,
                    'full_name'  => $user->full_name,
                    'email'      => $user->email,
                    'phone'      => $user->phone,
                    'role'       => $role ? ['id' => $role->id, 'code' => $role->code, 'name' => $role->name] : null,
                    'is_primary' => (bool) $user->pivot->is_primary,
                    // Statut du rattachement à CETTE organisation (peut être suspendu sans
                    // toucher au compte utilisateur global, qui peut appartenir à d'autres ONG).
                    'status'     => $user->pivot->status,
                    // Le compte a-t-il été activé ? (invitation acceptée, mot de passe défini)
                    // — distinct du statut de rattachement ci-dessus, qui reste "active" même
                    // si la personne n'a jamais mis les pieds sur la plateforme.
                    'account_status' => $user->status,
                ];
            });

        return response()->json(['data' => $members]);
    }

    /**
     * Ajoute un membre à l'organisation par email.
     * - Si l'email correspond à un utilisateur existant déjà actif : simple rattachement.
     * - Sinon : génère un jeton d'invitation à usage unique (valable 7 jours),
     *   à partager manuellement (copier le lien depuis la page Membres) tant
     *   qu'aucun service d'envoi d'e-mail n'est branché. La personne définit
     *   elle-même son mot de passe via /invitation/{token}.
     */
    public function store(Request $request, Organization $organization)
    {
        $validator = Validator::make($request->all(), [
            'email'     => ['required', 'email'],
            'full_name' => ['nullable', 'string', 'max:255'],
            'role_code' => ['required', 'string', 'exists:roles,code'],
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $data = $validator->validated();
        $role = Role::where('code', $data['role_code'])->firstOrFail();

        $result = DB::transaction(function () use ($data, $organization, $role) {
            $existing = User::where('email', $data['email'])->first();
            $isNewUser = ! $existing;
            $invitationToken = null;

            if ($isNewUser) {
                $invitationToken = Str::random(48);
                $user = User::create([
                    'full_name' => $data['full_name'] ?? $data['email'],
                    'email'     => $data['email'],
                    'password'  => Hash::make(Str::random(32)), // remplacé dès l'acceptation de l'invitation
                    'status'    => 'invited',
                    'invitation_token' => $invitationToken,
                    'invitation_expires_at' => now()->addDays(7),
                ]);
            } else {
                $user = $existing;
                // Compte existant mais jamais activé (invité ailleurs, jamais accepté) :
                // on régénère un jeton frais plutôt que de laisser l'ancien traîner.
                if ($user->status === 'invited') {
                    $invitationToken = Str::random(48);
                    $user->update(['invitation_token' => $invitationToken, 'invitation_expires_at' => now()->addDays(7)]);
                }
            }

            if ($organization->users()->where('users.id', $user->id)->exists()) {
                throw ValidationException::withMessages([
                    'email' => ['Cet utilisateur appartient déjà à cette organisation.'],
                ]);
            }

            $organization->users()->attach($user->id, [
                'id'         => (string) Str::uuid(),
                'role_id'    => $role->id,
                'is_primary' => false,
                'status'     => 'active',
            ]);

            return [$user, $invitationToken];
        });

        [$user, $invitationToken] = $result;

        return response()->json([
            'data' => $user,
            // Présent uniquement si un nouveau jeton a été généré — la page Membres
            // l'affiche comme lien à copier/partager avec la personne invitée.
            'invitation_link' => $invitationToken ? url("/invitation/{$invitationToken}") : null,
        ], 201);
    }

    /**
     * Modifie le rôle ou le statut d'un membre existant.
     */
    public function update(Request $request, Organization $organization, User $user)
    {
        $validator = Validator::make($request->all(), [
            'role_code' => ['sometimes', 'string', 'exists:roles,code'],
            'status'    => ['sometimes', 'in:active,suspended'],
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $data = $validator->validated();
        $pivotUpdate = [];

        if (isset($data['role_code'])) {
            $pivotUpdate['role_id'] = Role::where('code', $data['role_code'])->firstOrFail()->id;
        }
        if (isset($data['status'])) {
            $pivotUpdate['status'] = $data['status'];
        }

        if (empty($pivotUpdate)) {
            return response()->json(['message' => 'Aucune modification fournie.'], 422);
        }

        $organization->users()->updateExistingPivot($user->id, $pivotUpdate);

        return response()->json(['message' => 'Membre mis à jour.']);
    }

    /**
     * Retire un membre de l'organisation (ne supprime pas son compte utilisateur global).
     */
    public function destroy(Request $request, Organization $organization, User $user)
    {
        if ($organization->users()->where('users.id', $user->id)->wherePivot('is_primary', true)->exists()) {
            return response()->json([
                'message' => "Impossible de retirer l'administrateur principal de l'organisation.",
            ], 422);
        }

        $organization->users()->detach($user->id);

        return response()->json(['message' => "Membre retiré de l'organisation."]);
    }
}
