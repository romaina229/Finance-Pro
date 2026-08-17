# Backend — ONG Finance Pro API

API Laravel 12, source de vérité pour toutes les organisations de la plateforme.

## Structure

```
backend/
├── app/
│   ├── Models/                 Organization, User, Role, Permission, Project, Donor,
│   │                            ExpenseCategory, PaymentMethod, Expense, Revenue...
│   ├── Http/
│   │   ├── Controllers/Api/    AuthController, OrganizationController, UserController,
│   │   │                        ProjectController, DonorController, ExpenseCategoryController,
│   │   │                        ExpenseController, RevenueController, RoleController
│   │   └── Middleware/         EnsureOrganizationAccess (org.access), EnsurePermission (permission:<code>)
│   ├── Services/                Logique métier (à venir)
│   ├── Sync/                    Moteur de synchronisation (à venir)
│   └── Reports/                 Génération de rapports (à venir)
├── bootstrap/app.php            Enregistre routes/api.php + middleware Sanctum + alias org.access/permission
├── config/                      Configuration Laravel complète (générée par composer create-project)
├── database/
│   ├── migrations/               Toutes les tables du schéma (voir docs/database/postgresql_schema.sql)
│   └── seeders/                  RoleSeeder, PermissionSeeder, ExpenseCategorySeeder, DatabaseSeeder
├── routes/
│   ├── api.php                   Toutes les routes API
│   ├── web.php
│   └── console.php
├── composer.json / composer.lock
└── .env.example
```

## Installation

⚠️ Le `composer.lock` présent dans ce dépôt a été généré **avant** l'ajout de `laravel/sanctum`
à `composer.json` (fusion entre mon scaffold et votre `composer create-project` local).
La première fois, utilisez `composer update` et non `composer install` :

```bash
cd backend
composer update laravel/sanctum
composer install
cp .env.example .env
php artisan key:generate
```

Configurez `.env` avec vos identifiants PostgreSQL (voir les variables `DB_*` — le fichier
`.env.example` est reparti du modèle Laravel par défaut en SQLite, changez `DB_CONNECTION=pgsql`
et renseignez `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`), puis :

```bash
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

## Sécurité multi-tenant

Toute route de la forme `/organizations/{organization}/...` passe par le middleware
`org.access` (`App\Http\Middleware\EnsureOrganizationAccess`), qui vérifie que
l'utilisateur authentifié appartient bien à cette organisation avant de continuer.
Les actions sensibles ajoutent en plus `permission:<code>`
(`App\Http\Middleware\EnsurePermission`), qui vérifie que le rôle de l'utilisateur
**dans cette organisation précise** a la permission requise (voir `PermissionSeeder`
pour la liste des permissions et `RoleSeeder` pour les rôles).

## État d'avancement (ordre de construction)

- [x] 1. Architecture du projet
- [x] 2. Authentification (migrations, AuthController, Sanctum, seeders rôles/permissions)
- [x] 3. Organisations (OrganizationController: index/show/update, middleware org.access)
- [x] 4. Utilisateurs / rôles / permissions (UserController, RoleController, middleware permission:<code>)
- [x] 5. Projets (ProjectController, DonorController, migrations projects + donors)
- [x] 6. Plan comptable (ExpenseCategoryController, ExpenseCategorySeeder — modèle SYSCOHADA de départ)
- [x] 7. Dépenses (ExpenseController avec cycle draft→pending_approval→approved/rejected→paid, payment_methods)
- [x] 8. Recettes (RevenueController, même cycle, projet/bailleur optionnels)
- [ ] 9. Caisse
- [ ] ... voir le README principal pour la suite
