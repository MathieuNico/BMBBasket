import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,woff2}'] },
      manifest: {
        id: '/',
        name: 'BMB Playbook',
        short_name: 'BMB',
        description: 'Systèmes de jeu et séances d’entraînement du Bégrolles le May Basket',
        lang: 'fr',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#ffffff',
        background_color: '#f4f6fa',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: { port: 5173, strictPort: true },
})
