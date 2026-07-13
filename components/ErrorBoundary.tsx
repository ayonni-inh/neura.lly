import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-mirror-bg text-mirror-text p-4 text-center">
          <div className="max-w-md w-full glass-matte p-8 rounded-3xl border border-red-500/20 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-4 text-red-100">System Anomaly Detected</h1>
            <p className="text-mirror-subtext mb-8 text-sm">
              The neural interface encountered an unexpected error. Our cognitive systems have logged the anomaly.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 px-4 bg-mirror-accent hover:bg-mirror-accent/80 text-white rounded-xl font-bold transition-colors"
              >
                Reinitialize Interface
              </button>
              <button
                onClick={async () => {
                  try {
                    localStorage.clear();
                    const databases = await window.indexedDB.databases();
                    databases.forEach(db => {
                      if (db.name) window.indexedDB.deleteDatabase(db.name);
                    });
                    window.location.reload();
                  } catch (e) {
                    console.error('Failed to clear storage:', e);
                    window.location.reload();
                  }
                }}
                className="w-full py-3 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold transition-colors text-xs uppercase tracking-widest border border-red-500/20"
              >
                Reset & Clear Cache
              </button>
            </div>
            {this.state.error && (
              <div className="mt-6 p-4 bg-black/40 rounded-xl text-left overflow-auto max-h-32">
                <p className="text-xs text-red-300 font-mono break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
