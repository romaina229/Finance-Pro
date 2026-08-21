<?php

namespace App\Console\Commands;

use App\Models\SuperAdmin;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

/**
 * php artisan super-admin:create
 * Seul moyen de créer un compte Super Admin — volontairement absent de
 * toute route API publique pour éviter qu'un compte de supervision de
 * toute la plateforme puisse être créé depuis l'extérieur.
 */
class CreateSuperAdmin extends Command
{
    protected $signature = 'super-admin:create';
    protected $description = 'Crée un compte Super Admin (accès total à la plateforme)';

    public function handle(): int
    {
        $fullName = $this->ask('Nom complet');
        $email = $this->ask('Email');
        $password = $this->secret('Mot de passe (8 caractères minimum)');

        $validator = Validator::make(compact('fullName', 'email', 'password'), [
            'fullName' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:super_admins,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }
            return self::FAILURE;
        }

        SuperAdmin::create([
            'full_name' => $fullName,
            'email' => $email,
            'password' => Hash::make($password),
        ]);

        $this->info("Compte Super Admin créé pour {$email}.");

        return self::SUCCESS;
    }
}
