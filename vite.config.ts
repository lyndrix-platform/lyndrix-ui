import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// API_PROXY_TARGET is set in docker/.env.dev when running in the container.
// In local dev (npm run dev) it defaults to the lyndrix-core dev server.
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:8081'

// lyndrix-ui is deployed standalone (nginx at /), so the build base defaults to '/'.
// VITE_BASE can override it (e.g. '/app/') if the SPA is ever embedded under a subpath.
export default defineConfig(() => ({
  base: process.env.VITE_BASE ?? '/',
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Polling keeps hot reload reliable inside Docker / WSL2 volume mounts.
    watch: {
      usePolling: !!process.env.CHOKIDAR_USEPOLLING,
      interval: 300,
    },
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
}))
