import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // The app lives in `web/`, while some dependencies are installed at the
  // repository root. Keep React shared across both dependency locations.
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  // Polling keeps file changes visible in environments where the native
  // filesystem watcher does not report edits reliably (common on Windows).
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
  plugins: [
    tailwindcss(),
    react(),
  ],
})
