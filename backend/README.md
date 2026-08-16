# Backend — ONG Finance Pro API

API Laravel 12, source de vérité pour toutes les organisations de la plateforme.

## Structure

```
backend/
├── app/
│   ├── Models/           Modèles Eloquent (Organization, Project, Expense...)
│   ├── Http/Controllers/Api/   Contrôleurs REST
│   ├── Services/         Logique métier (AccountingService, ProjectService...)
│   ├── Sync/             Moteur de synchronisation (upload/download/conflits)
│   ├── Reports/          Génération de rapports (SYSCOHADA, bailleurs)
│   └── Permissions/      Gestion des rôles et permissions
├── database/
│   ├── migrations/       Migrations (voir docs/database/postgresql_schema.sql pour le schéma cible)
│   └── seeders/          Données de départ (rôles, plan comptable SYSCOHADA...)
├── routes/api.php        Toutes les routes de l'API
├── composer.json
└── .env.example
```

## Installation (à faire en local — composer non disponible dans cet environnement de génération)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Configurer `.env` avec vos identifiants PostgreSQL locaux, puis :

```bash
php artisan migrate
php artisan db:seed
php artisan serve
```

## Prochaine étape

Les migrations (`database/migrations/`) sont vides pour l'instant — elles seront générées à partir du schéma défini dans `../docs/database/postgresql_schema.sql`, table par table, dans l'ordre de construction du projet (Authentification → Organisations → Utilisateurs → Projets → ...).
