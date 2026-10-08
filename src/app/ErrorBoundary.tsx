import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)] text-[var(--text)]">
          <div className="w-full max-w-md p-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] text-center shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--expense)]/10 text-[var(--expense)] flex items-center justify-center mb-4">
              <AlertOctagon className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
              An unexpected error occurred. Your offline records and data are preserved safely.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 transition active:scale-95 cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
