import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  viewName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Per-view error boundary. Catches render errors in a single view
 * so the rest of the app (sidebar, header, other views) stays functional.
 * Shows an inline error card with a retry button instead of crashing the whole app.
 */
export class ViewErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logger.error(
      `[ViewErrorBoundary${this.props.viewName ? `: ${this.props.viewName}` : ""}]`,
      error,
      info,
    );
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Esta sección tuvo un problema</h2>
          <p className="text-sm text-slate-500 mb-1">
            {this.props.viewName
              ? `Error al cargar "${this.props.viewName}".`
              : "Error al cargar esta sección."}
          </p>
          <p className="text-sm text-slate-500 mb-4">
            Las demás secciones siguen funcionando normalmente.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw size={16} /> Reintentar
            </button>
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Home size={16} /> Ir al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }
}
