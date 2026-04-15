import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[AppErrorBoundary] Uncaught error:", error, errorInfo);
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoToDashboard = () => {
    window.location.href = "/app";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred. Please refresh the page to continue.
              </p>
            </div>
            {this.state.error && (
              <pre className="text-[10px] text-muted-foreground bg-muted/50 rounded-lg p-3 text-left overflow-auto max-h-24">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleRefresh}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="h-4 w-4" /> Refresh Page
              </button>
              <button
                onClick={this.handleGoToDashboard}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card text-foreground hover:bg-accent transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" /> Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
