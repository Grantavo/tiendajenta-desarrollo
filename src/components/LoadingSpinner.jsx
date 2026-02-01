import React from "react";
import { ShoppingBag } from "lucide-react";

export default function LoadingSpinner({ fullScreen = false }) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          {/* Ícono animado */}
          <div className="relative inline-block">
            <div className="w-20 h-20 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div>
            <ShoppingBag
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400"
              size={32}
            />
          </div>

          {/* Texto */}
          <p className="mt-6 text-slate-600 font-semibold text-lg animate-pulse">
            Cargando...
          </p>
        </div>
      </div>
    );
  }

  // Loading inline (para usar dentro de componentes)
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="relative inline-block">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div>
          <ShoppingBag
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />
        </div>
        <p className="mt-3 text-slate-500 text-sm">Cargando...</p>
      </div>
    </div>
  );
}
