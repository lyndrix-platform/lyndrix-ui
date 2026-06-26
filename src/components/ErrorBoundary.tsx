import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State { error: Error | null }

/**
 * General page-level error boundary. A render error in any single page (e.g. a
 * bad API shape) is caught here and shown as an inline fallback with a reload
 * action, instead of throwing past the router and blanking the whole app.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] render error', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="max-w-lg mx-auto px-6 py-16 text-center">
          <p className="text-sm font-medium text-[var(--lx-text)] mb-1">Diese Ansicht ist abgestürzt</p>
          <p className="text-xs text-[var(--lx-text-muted)] mb-4 break-words">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="lx-btn lx-btn--secondary lx-btn--sm"
          >
            Erneut versuchen
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
