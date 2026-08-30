'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production this would go to Sentry / Datadog
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center p-8">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="font-semibold text-lg">Something went wrong</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// ── Convenience wrapper for async query errors ────────────────────────────────
export function QueryErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error
  resetErrorBoundary: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <AlertTriangle className="w-8 h-8 text-destructive" />
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="text-sm text-primary underline underline-offset-4"
      >
        Try again
      </button>
    </div>
  )
}
