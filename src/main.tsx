import * as React from 'react'
import * as ReactDOMClient from 'react-dom/client'
import { StrictMode, Suspense, lazy, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

// Devtools are lazily imported only in development so the module is never pulled
// into the production bundle (the component self-disables at runtime in prod, but
// the static import still shipped its code).
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
    )
  : null

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

import * as ReactI18next from 'react-i18next'
import i18n, { bootstrapI18n, hasUsableCatalog } from './lib/i18n'
import { getCatalog } from './lib/catalogStore'
import { sharedUi } from './lib/sharedUi'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import LoadingSplash from './components/LoadingSplash'
import { ThemeProvider } from './theme/ThemeProvider'
import { ApiError } from './lib/api'
import { toast } from './lib/toast'

// Expose React for IIFE plugin bundles so they share this instance.
// Plugin vite.ui.config.ts should declare:
//   external: ['react', 'react-dom/client']
//   globals: { react: '__lyndrix_react', 'react-dom/client': '__lyndrix_react_dom_client' }
;(window as unknown as Record<string, unknown>)['__lyndrix_react'] = React
;(window as unknown as Record<string, unknown>)['__lyndrix_react_dom_client'] = ReactDOMClient
// Shared UI library + i18n instance/context for federated plugin bundles.
// Plugins externalize '@lyndrix/ui' → __lyndrix_ui, 'react-i18next' →
// __lyndrix_react_i18next, 'i18next' → __lyndrix_i18n in their vite config.
;(window as unknown as Record<string, unknown>)['__lyndrix_ui'] = sharedUi
;(window as unknown as Record<string, unknown>)['__lyndrix_i18n'] = i18n
;(window as unknown as Record<string, unknown>)['__lyndrix_react_i18next'] = ReactI18next

const queryClient = new QueryClient({
  // A failed *background* refetch otherwise fails silently and the page keeps
  // showing stale data with no hint. Initial-load errors stay with the page
  // (each page renders its own error state), and 401s are handled by the
  // apiFetch redirect — both are excluded here to avoid double-reporting.
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.state.data === undefined) return
      if (error instanceof ApiError && error.status === 401) return
      toast.error(error instanceof Error ? error.message : String(error))
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

/**
 * Gates first paint on localization. With a cached catalog (returning visit) we
 * render immediately and revalidate in the background — components re-render via
 * i18next's `added` binding. On a true first run with no cache we show a neutral,
 * string-free splash until the first catalog load resolves, retrying while the
 * device is offline.
 */
function I18nGate({ children }: { children: React.ReactNode }) {
  const hasCache = hasUsableCatalog(i18n.language) || !!getCatalog(i18n.language)
  const [ready, setReady] = useState(hasCache)

  useEffect(() => {
    let alive = true
    let backoff: ReturnType<typeof setTimeout> | undefined

    async function attempt() {
      const ok = await bootstrapI18n()
      if (!alive) return
      if (hasCache || ok) {
        setReady(true)
        return
      }
      // No cache and the fetch failed (offline first run): retry with backoff
      // and immediately when connectivity returns.
      backoff = setTimeout(attempt, 3000)
    }

    void attempt()
    const onOnline = () => void attempt()
    window.addEventListener('online', onOnline)
    return () => {
      alive = false
      if (backoff) clearTimeout(backoff)
      window.removeEventListener('online', onOnline)
    }
  }, [hasCache])

  return ready ? <>{children}</> : <LoadingSplash />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <I18nGate>
          <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            {/* Last-resort boundary: route generation, redirects and public pages
                in App render OUTSIDE the per-page boundaries inside AuthShell — a
                throw there previously white-screened the whole app. */}
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </BrowserRouter>
        </I18nGate>
        {ReactQueryDevtools && (
          <Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} />
          </Suspense>
        )}
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
