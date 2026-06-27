import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react'

interface State { error: Error | null; resetKey: number }

/**
 * General page-level error boundary. A render error in any single page (e.g. a
 * bad API shape) is caught here and shown as an inline fallback with a retry
 * action, instead of throwing past the router and blanking the whole app.
 *
 * Retry bumps `resetKey`, which is the key of the fragment wrapping the children,
 * forcing React to unmount and remount the subtree. A plain `error: null` reset
 * would re-render the same (still-broken) children and immediately re-throw for
 * any deterministic error; remounting re-runs effects/queries so a transient
 * failure can actually recover.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, resetKey: 0 }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] render error', error, info)
  }

  private retry = () => {
    this.setState((s) => ({ error: null, resetKey: s.resetKey + 1 }))
  }

  render() {
    if (this.state.error) {
      return (
        <div className="max-w-lg mx-auto px-6 py-16 text-center">
          <p className="text-sm font-medium text-[var(--lx-text)] mb-1">Diese Ansicht ist abgestürzt</p>
          <p className="text-xs text-[var(--lx-text-muted)] mb-4 break-words">{this.state.error.message}</p>
          <button onClick={this.retry} className="lx-btn lx-btn--secondary lx-btn--sm">
            Erneut versuchen
          </button>
        </div>
      )
    }
    return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>
  }
}
