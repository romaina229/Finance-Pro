# Frontend Web — ONG Finance Pro

Application web (React + TypeScript + Tailwind CSS v4 + Vite).

## Installation

```bash
cd frontend-web
npm install
npm run dev
```

L'application démarre sur `http://localhost:5173`.

## Structure prévue

```
src/
├── components/     Composants UI réutilisables
├── pages/          Pages / vues (Dashboard, Expenses, Projects...)
├── services/       Appels API (Axios/Fetch vers le backend Laravel)
├── store/          Gestion d'état (Zustand ou Redux Toolkit)
├── offline/        Couche IndexedDB / cache offline côté navigateur
├── types/          Types TypeScript partagés
└── App.tsx
```

## Build de production

```bash
npm run build
```
