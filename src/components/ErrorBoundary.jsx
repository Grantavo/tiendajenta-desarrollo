import React from "react";
import { RefreshCw, Home } from "lucide-react";

/**
 * ErrorBoundary — Atrapa errores de renderizado en React.
 * Si un componente hijo crashea, muestra una UI de recuperación
 * en lugar de dejar la pantalla en blanco.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("🔴 [ErrorBoundary] Error capturado:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
              <span className="text-3xl">😵</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              Algo salió mal
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              Hubo un problema al cargar esta sección. Puedes intentar recargar
              o volver al inicio.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
              >
                <RefreshCw size={16} />
                Reintentar
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                <Home size={16} />
                Ir al Inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
