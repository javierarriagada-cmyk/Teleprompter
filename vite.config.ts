/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// LA APLICACIÓN WEB INSTALABLE, SOLO FUERA DE PLAY -tarea 84, B3, 29-09-2026-.
//
// VitePWA genera el service worker -sw.js, registerSW.js, workbox- y manifest.webmanifest. Dentro
// de la app no sirven: los archivos ya viajan en el paquete, y un service worker viejo sirviendo
// el código de la instalación anterior fue el problema de src/lib/actualizacion.ts. En modo play
// no se generan.
//
// EN EL MODO ANDROID -la APK de prueba- SE QUEDA, Y ES A PROPÓSITO. El encargo pedía sacarlo de
// los dos modos "si no cambia la APK de prueba", y la cambia: registerSW.js registra el service
// worker en cada arranque y sacarServiceWorkerEnNativo lo desregistra y recarga si había uno
// controlando. Quitarlo cambia ese arranque en el moto g86, y la regla madre de la tarea 84 es
// que la APK de prueba siga andando igual. Queda para cuando Claude lo pruebe en el teléfono.
export default defineConfig(({ mode }) => ({
  base: '/',
  worker: {
    format: 'es'
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // Fija el idioma de la app en espanol antes de cada prueba -tarea 75-.
    setupFiles: ['./src/pruebas/preparacion.ts']
  },
  plugins: [
    react(),
    mode !== 'play' && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      workbox: {
        globIgnores: ['**/*.worker-*.js', '**/*.wasm']
      },
      manifest: {
        id: 'com.sigoteleprompter.app',
        name: 'SIGO - Teleprompter',
        short_name: 'Sigo',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#000000',
        theme_color: '#000000',
        lang: 'es',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ]
}))
