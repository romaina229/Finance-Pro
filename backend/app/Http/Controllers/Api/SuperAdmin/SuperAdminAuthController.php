<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\SuperAdmin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class SuperAdminAuthController extends Controller
{
    /**
     * Connexion. Aucune route d'inscription publique n'existe pour ce
     * compte : un super admin ne peut être créé que par la commande
     * artisan super-admin:create (ou directement en base), jamais via
     * un formulaire exposé publiquement.
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

        $admin = SuperAdmin::where('email', $request->email)->first();

        if (! $admin || ! Hash::check($request->password, $admin->password)) {
            throw ValidationException::withMessages([
                'email' => ['Les identifiants fournis sont incorrects.'],
            ]);
        }

        $admin->update(['last_login_at' => now()]);

        $token = $admin->createToken('super_admin_token')->plainTextToken;

        return response()->json(['admin' => $admin, 'token' => $token]);
    }

    public function logout(Request $request)
    {
        $request->user('super_admin')->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnexion réussie.']);
    }

    public function me(Request $request)
    {
        return response()->json(['admin' => $request->user('super_admin')]);
    }
}
