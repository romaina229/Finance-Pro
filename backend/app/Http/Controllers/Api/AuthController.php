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
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Inscription d'un nouvel utilisateur.
     *
     * Deux cas :
     * - "organization_name" fourni  -> crée une nouvelle ONG et rend l'utilisateur org_admin
     * - "invitation_token" fourni   -> rattache l'utilisateur à une ONG existante (à implémenter
     *   avec le module Invitations, étape "Utilisateurs / rôles / permissions")
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'full_name'         => ['required', 'string', 'max:255'],
            'email'             => ['required', 'email', 'unique:users,email'],
            'phone'             => ['nullable', 'string', 'max:30'],
            'password'          => ['required', 'string', 'min:8', 'confirmed'],
            'organization_name' => ['required', 'string', 'max:255'],
            'country'           => ['nullable', 'string', 'max:100'],
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $data = $validator->validated();

        $result = DB::transaction(function () use ($data) {
            $organization = Organization::create([
                'name'    => $data['organization_name'],
                'country' => $data['country'] ?? 'Bénin',
            ]);

            $user = User::create([
                'full_name' => $data['full_name'],
                'email'     => $data['email'],
                'phone'     => $data['phone'] ?? null,
                'password'  => Hash::make($data['password']),
                'status'    => 'active',
            ]);

            $orgAdminRole = Role::where('code', 'org_admin')->firstOrFail();

            $organization->users()->attach($user->id, [
                'id'         => (string) \Illuminate\Support\Str::uuid(),
                'role_id'    => $orgAdminRole->id,
                'is_primary' => true,
                'status'     => 'active',
            ]);

            return [$user, $organization];
        });

        [$user, $organization] = $result;

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user'         => $user,
            'organization' => $organization,
            'token'        => $token,
        ], 201);
    }

    /**
     * Connexion — retourne un jeton Sanctum et les organisations accessibles.
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ["Les identifiants fournis sont incorrects."],
            ]);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages([
                'email' => ["Ce compte n'est pas actif. Contactez votre administrateur."],
            ]);
        }

        $user->update(['last_login_at' => now()]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user'          => $user,
            'organizations' => $user->organizations()->get(['organizations.id', 'organizations.name', 'organizations.acronym']),
            'token'         => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnexion réussie.']);
    }

    public function me(Request $request)
    {
        return response()->json([
            'user'          => $request->user(),
            'organizations' => $request->user()->organizations()->get(['organizations.id', 'organizations.name', 'organizations.acronym']),
        ]);
    }

    /**
     * Consulte une invitation (public, sans authentification) : permet à la
     * page d'acceptation d'afficher "Bonjour {nom}, vous êtes invité(e) chez {ONG}"
     * avant que la personne ne définisse son mot de passe.
     */
    public function showInvitation(Request $request, string $token)
    {
        $user = User::where('invitation_token', $token)
            ->where('invitation_expires_at', '>', now())
            ->first();

        if (! $user) {
            return response()->json(['message' => 'Ce lien d’invitation est invalide ou a expiré.'], 404);
        }

        $organizations = $user->organizations()->get(['organizations.id', 'organizations.name']);

        return response()->json([
            'full_name'     => $user->full_name,
            'email'         => $user->email,
            'organizations' => $organizations,
        ]);
    }

    /**
     * Accepte une invitation : définit le mot de passe choisi par la personne
     * invitée, active son compte, invalide le jeton (usage unique), et la
     * connecte directement (retourne un jeton Sanctum comme login()).
     */
    public function acceptInvitation(Request $request, string $token)
    {
        $validator = Validator::make($request->all(), [
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $user = User::where('invitation_token', $token)
            ->where('invitation_expires_at', '>', now())
            ->first();

        if (! $user) {
            return response()->json(['message' => 'Ce lien d’invitation est invalide ou a expiré.'], 404);
        }

        $user->update([
            'password'              => Hash::make($request->password),
            'status'                => 'active',
            'invitation_token'      => null,
            'invitation_expires_at' => null,
            'last_login_at'         => now(),
        ]);

        $accessToken = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user'          => $user,
            'organizations' => $user->organizations()->get(['organizations.id', 'organizations.name', 'organizations.acronym']),
            'token'         => $accessToken,
        ]);
    }
}
