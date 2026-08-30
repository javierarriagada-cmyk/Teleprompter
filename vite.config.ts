import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  worker: {
    format: 'es'
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'Teleprompter MVP',
        short_name: 'Teleprompter',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000'
      }
    })
  ]
})
