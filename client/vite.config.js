import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Inoltra le chiamate /api al backend Node.js/Express (MySQL)
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      // Inoltra le richieste dei file caricati (foto, PDF, certificazioni...)
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
