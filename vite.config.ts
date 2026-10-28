import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Local and root hosting use '/'. A GitHub Pages project site sets BASE_PATH=/<repo-name>/ at build time.
  base: process.env.BASE_PATH || '/',
  plugins: [
    react(),
    VitePWA({
      // 'prompt': a new version waits until the user chooses to update, so a reload never eats unsaved typing.
      registerType: 'prompt',
      injectRegister: false, // registered by hand in src/lib/pwa.ts (production only)
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Parked Where?',
        short_name: 'Parked Where',
        description: 'Save where you parked and find your way back. Free, private, works offline.',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        lang: 'en',
        categories: ['navigation', 'utilities'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The whole app shell, including the lazily loaded map chunk and the self-hosted fonts.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        // Deliberately no runtime caching: map tiles must not be bulk-cached (OpenStreetMap tile policy)
        // and address lookups should always be fresh.
      },
    }),
  ],
  test: { environment: 'node' },
})
