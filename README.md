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
2. Schéma de base de données ✅
3. Authentification
4. Organisations
5. Utilisateurs / rôles / permissions
6. Projets
7. Plan comptable
8. Dépenses / Recettes
9. Caisse / Banque
10. Budgets
11. Pièces justificatives
12. Rapports
13. Audit / traçabilité
14. Moteur Offline First
15. Synchronisation
16. Gestion des conflits
17. Tableau de bord
18. Desktop / Mobile
19. Tests / Déploiement

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
