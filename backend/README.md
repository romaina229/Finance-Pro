# Backend — ONG Finance Pro API

API Laravel 12, source de vérité pour toutes les organisations de la plateforme.

## Structure

```
backend/
├── app/
│   ├── Models/                 Organization, User, Role, Permission...
│   ├── Http/Controllers/Api/   AuthController...
│   ├── Services/                Logique métier (à venir : AccountingService...)
│   ├── Sync/                    Moteur de synchronisation (à venir)
│   ├── Reports/                 Génération de rapports (à venir)
│   └── Permissions/              Gestion fine des rôles (à venir)
├── bootstrap/app.php            Config Laravel 12 : enregistre routes/api.php + middleware Sanctum
├── config/sanctum.php           Config Sanctum (domaines stateful, expiration...)
├── database/
│   ├── migrations/               6 migrations : currencies, organizations, roles/permissions,
│   │                              users, user_organizations, personal_access_tokens
│   └── seeders/                  RoleSeeder, PermissionSeeder, DatabaseSeeder
├── routes/
│   ├── api.php                   Toutes les routes API (auth branchée, le reste en stub)
│   ├── web.php                   Route de vérification (/)
│   └── console.php
├── composer.json
└── .env.example
```

## Installation

Cet environnement de génération n'a pas accès à Packagist, donc `composer install` n'a jamais pu être exécuté ici. Deux façons de démarrer en local :

### Option A — le plus simple : composer install direct

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Configurez `.env` avec vos identifiants PostgreSQL, puis :

```bash
php artisan migrate
php artisan db:seed
php artisan serve
```

### Option B — si `composer install` échoue à cause de fichiers manquants

Si votre version de Composer exige un projet Laravel "propre" au préalable (fichiers `public/index.php`, `config/*.php` non fournis ici pour rester léger), générez un squelette neuf puis fusionnez :

```bash
composer create-project laravel/laravel:^12.0 backend-tmp
cp -r backend-tmp/public backend-tmp/config backend/     # ne copiez pas config/sanctum.php, on le garde
rm -rf backend-tmp
cd backend
composer require laravel/sanctum
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

## Tester l'authentification une fois lancé

```bash
# Inscription (crée l'utilisateur ET son organisation)
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Jean Dupont","email":"jean@ong.bj","password":"password123","password_confirmation":"password123","organization_name":"ONG Espoir Bénin"}'

# Connexion
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jean@ong.bj","password":"password123"}'
```

## État d'avancement (ordre de construction)

- [x] 1. Architecture du projet
- [x] 2. Authentification (migrations, AuthController, Sanctum, seeders rôles/permissions)
- [x] 3. Organisations (OrganizationController: index/show/update, middleware org.access)
- [x] 4. Utilisateurs / rôles / permissions (UserController, RoleController, middleware permission:<code>)
- [x] 5. Projets (ProjectController, DonorController, migrations projects + donors)
- [x] 6. Plan comptable (ExpenseCategoryController, ExpenseCategorySeeder — modèle SYSCOHADA de départ)
- [x] 7. Dépenses (ExpenseController avec cycle draft→pending_approval→approved/rejected→paid, payment_methods)
- [ ] 8. Recettes
- [ ] ... voir le README principal pour la suite
