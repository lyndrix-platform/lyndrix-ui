import * as React from 'react'
import * as ReactDOMClient from 'react-dom/client'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'

// Self-hosted fonts + icons (bundled by Vite) — prod has no internet, so a
// render-blocking Google-Fonts <link>/@import would freeze the whole UI offline.
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/400-italic.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
import '@fontsource/jetbrains-mono/700.css'
import 'material-icons/iconfont/filled.css'

import './index.css'
import App from './App.tsx'

// Expose React for IIFE plugin bundles so they share this instance.
// Plugin vite.ui.config.ts should declare:
//   external: ['react', 'react-dom/client']
//   globals: { react: '__lyndrix_react', 'react-dom/client': '__lyndrix_react_dom_client' }
;(window as unknown as Record<string, unknown>)['__lyndrix_react'] = React
;(window as unknown as Record<string, unknown>)['__lyndrix_react_dom_client'] = ReactDOMClient

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <App />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
)
