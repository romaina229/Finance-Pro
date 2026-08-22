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
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if ($validator->fails()) throw new ValidationException($validator);

        $admin = SuperAdmin::where('email', $request->email)->first();
        if (! $admin || ! Hash::check($request->password, $admin->password)) {
            throw ValidationException::withMessages(['email' => ['Les identifiants fournis sont incorrects.']]);
        }

        $admin->update(['last_login_at' => now()]);
        $token = $admin->createToken('super_admin_token')->plainTextToken;
        return response()->json(['admin' => $admin, 'token' => $token]);
    }

    /** Bootstrap : accessible uniquement tant qu'aucun Super Admin n'existe. */
    public function register(Request $request)
    {
        if (SuperAdmin::query()->exists()) {
            return response()->json(['message' => 'Le compte Super Admin initial existe déjà. Connectez-vous pour gérer le compte.'], 409);
        }

        $validator = Validator::make($request->all(), [
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:super_admins,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);
        if ($validator->fails()) throw new ValidationException($validator);

        $admin = SuperAdmin::create([
            'full_name' => $request->string('full_name')->trim()->toString(),
            'email' => $request->string('email')->trim()->lower()->toString(),
            'password' => $request->input('password'),
        ]);

        $token = $admin->createToken('super_admin_token')->plainTextToken;
        return response()->json(['admin' => $admin, 'token' => $token], 201);
    }

    public function updateProfile(Request $request)
    {
        /** @var SuperAdmin $admin */
        $admin = $request->user('super_admin');
        $validator = Validator::make($request->all(), [
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:super_admins,email,' . $admin->id],
            'current_password' => ['nullable', 'required_with:password', 'string'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);
        if ($validator->fails()) throw new ValidationException($validator);

        if ($request->filled('password') && ! Hash::check($request->input('current_password'), $admin->password)) {
            throw ValidationException::withMessages(['current_password' => ['Le mot de passe actuel est incorrect.']]);
        }

        $admin->full_name = $request->string('full_name')->trim()->toString();
        $admin->email = $request->string('email')->trim()->lower()->toString();
        if ($request->filled('password')) $admin->password = $request->input('password');
        $admin->save();

        return response()->json(['admin' => $admin->fresh()]);
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
