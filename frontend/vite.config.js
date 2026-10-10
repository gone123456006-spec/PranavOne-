import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    rolldownOptions: {
      checks: {
        pluginTimings: false,
      },
    },
  },
  server: {
    host: true, // expose on LAN for phones / other devices
    port: 5173,
    proxy: {
      '/api': {
        // Port 5000 is taken by macOS AirPlay Receiver.
        target: process.env.API_PROXY_TARGET || 'http://localhost:5055',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
  },
})
