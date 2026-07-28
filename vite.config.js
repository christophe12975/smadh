import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',

      includeAssets: [
        'favicon.svg',
        'icon-192.png',
        'icon-512.png'
      ],

      manifest: {
        name: 'HydroClim Analyzer',

        short_name: 'HydroClim',

        description:
          "Application d'analyse hydroclimatique",

        theme_color: '#0B5ED7',

        background_color: '#071E33',

        display: 'standalone',

        orientation: 'portrait',

        start_url: '/',

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
          }
        ]
      }
    })
  ]
})