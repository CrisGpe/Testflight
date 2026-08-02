import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'WorkerApp NFC PWA',
        short_name: 'WorkerApp',
        description: 'Aplicación PWA de Marcaje Presencial NFC e Histórico Rápido',
        theme_color: '#090d16',
        background_color: '#090d16',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
