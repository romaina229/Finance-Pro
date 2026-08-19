import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true,
      },
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Finance Pro',
        short_name: 'Finance Pro',
        description:
          "Gestion financière offline-first pour ONG au Bénin et en Afrique de l'Ouest — projets, dépenses, recettes, caisse, banque, budgets, rapports.",
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#0f172a',
        theme_color: '#1e40af',
        categories: ['finance', 'business', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache complet : precache tout le bundle (JS/CSS/HTML/icônes) au premier
        // chargement, pour que l'application s'ouvre même sans connexion du tout.
        // Le moteur de synchronisation applicatif (IndexedDB + file de mutations)
        // gère séparément les données métier — le service worker ne fait que
        // servir la coquille de l'app (app shell) depuis le cache.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Les appels à l'API restent réseau-first : on ne veut jamais
            // servir de vieilles données financières depuis un cache HTTP
            // générique (le moteur offline applicatif s'en charge déjà).
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
})
