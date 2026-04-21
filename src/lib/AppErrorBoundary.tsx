import React, { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: "" };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const info = errorInfo.componentStack || "";
    this.setState({ errorInfo: info });
    console.error(`[SafeGuard] ${this.props.moduleName || "App"} crashed:`, error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: "" });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-8">
          <div className="max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-lg">
            <div className="mb-4 text-4xl">🛡️</div>
            <h2 className="mb-2 text-xl font-bold text-foreground">
              {this.props.moduleName
                ? `ماژول «${this.props.moduleName}» متوقف شد`
                : "خطایی در سیستم رخ داد"}
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              سیستم در حالت ایمن قرار گرفت. داده‌های شما محفوظ است.
            </p>
            {this.state.error && (
              <pre className="mb-4 max-h-24 overflow-auto rounded bg-muted p-2 text-left text-xs text-muted-foreground">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleRetry}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                تلاش مجدد
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                بارگذاری مجدد
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
