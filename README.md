# ONG Finance Pro

Plateforme de gestion financière offline-first pour ONG au Bénin et en Afrique de l'Ouest — multi-organisation, multi-devise, synchronisation automatique.

## Structure du monorepo

```
Finance-Pro/
├── backend/           API Laravel (source de vérité, PostgreSQL)
├── frontend-web/      Application web (React + TypeScript + Tailwind)
├── frontend-desktop/  Application desktop (Electron, embarque frontend-web)
├── mobile/            Application mobile (techno à définir)
└── docs/
    └── database/      Schéma PostgreSQL + SQLite, documentation
```

## Démarrage rapide

Voir le README de chaque dossier pour les instructions d'installation spécifiques :
- [`backend/README.md`](./backend/README.md)
- [`frontend-web/README.md`](./frontend-web/README.md)
- [`frontend-desktop/README.md`](./frontend-desktop/README.md)

## Ordre de construction du projet

1. Architecture du projet ✅
2. Authentification ✅ — migrations, AuthController (Laravel + Sanctum), pages Login/Register (React)
3. Organisations ✅ — CRUD (consultation, modification), sélecteur d'organisation courante côté frontend
4. Utilisateurs / rôles / permissions ✅ — invitation de membres, changement de rôle, retrait, middleware de permission
5. Projets ✅ — CRUD projets + bailleurs, formulaire complet (budget, dates, statut, bailleur)
6. Plan comptable ✅ — modèle SYSCOHADA de départ (seedé), catégories personnalisables par ONG
7. Dépenses ✅ — cycle complet brouillon → soumission → approbation/rejet → paiement
8. Recettes ✅ — même cycle, avec bailleur et projet optionnels (recette générale possible)
9. Caisse
6. Plan comptable
7. Dépenses
8. Recettes
9. Caisse
10. Banque
11. Budgets
12. Pièces justificatives
13. Rapports
14. Audit / traçabilité
15. Moteur Offline First
16. Synchronisation
17. Gestion des conflits
18. Tableau de bord
19. Desktop
20. Mobile
21. Tests
22. Déploiement

## Stack technique

| Élément | Technologie |
|---|---|
| Frontend web/desktop | React + TypeScript + Tailwind CSS |
| Desktop | Electron |
| Mobile | À définir |
| Backend | Laravel 12 (API REST) |
| Base locale | SQLite |
| Base serveur | PostgreSQL |
| Auth | Laravel Sanctum |
| Fichiers | Supabase Storage / S3 |
| Déploiement | Docker |
