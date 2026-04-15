import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Optional label shown in the fallback UI */
  section?: string;
}

interface State {
  hasError: boolean;
}

export default class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[PageErrorBoundary${this.props.section ? ` — ${this.props.section}` : ""}]`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {this.props.section ? `${this.props.section} failed to load` : "This section failed to load"}
            </p>
            <p className="text-xs text-muted-foreground">Try refreshing the page.</p>
          </div>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-card hover:bg-accent transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
