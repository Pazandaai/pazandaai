import { Component, ErrorInfo, ReactNode } from "react";

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
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught UI error:", error, errorInfo);
  }

  private handleReload = () => {
    try {
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-slate-50">
          <div className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 shadow-xl space-y-4">
            <div className="text-4xl">⚠️</div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Nimadir noto'g'ri bajarildi
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              Ilovada kutilmagan xatolik yuz berdi. Tugmani bosib ilovani qayta yuklang.
            </p>
            {this.state.error?.message ? (
              <div className="rounded-2xl bg-red-50 p-3 text-left font-mono text-[10px] text-red-600 overflow-auto max-h-24">
                {this.state.error.message}
              </div>
            ) : null}
            <button
              onClick={this.handleReload}
              className="h-12 w-full rounded-2xl bg-[#DB2777] font-extrabold text-sm text-white shadow-md active:scale-95 transition-transform"
            >
              🔄 Qayta yuklash
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
