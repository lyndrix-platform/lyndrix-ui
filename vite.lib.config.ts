import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'LyndrixUI',
      formats: ['es'],
      fileName: () => 'index.es.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', '@tanstack/react-query', 'react-router-dom', 'lucide-react', 'i18next', 'react-i18next'],
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
})
