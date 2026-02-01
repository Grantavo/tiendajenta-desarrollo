import React, { useState } from "react";
import { ShoppingBag } from "lucide-react";

export default function LoadingSpinner({ fullScreen = false }) {
  // CORRECCIÓN: Usamos "Lazy Initial State".
  // Pasamos una función al useState. Esto se ejecuta SOLO una vez antes de pintar.
  // Resultado: Cero re-renderizados innecesarios y adiós error.
  const [customLogo] = useState(() => {
    try {
      // Intentamos leer del localStorage inmediatamente
      const storedSettings = localStorage.getItem("shopSettings");
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        return parsed.logo || null; // Si existe el logo, lo usamos.
      }
    } catch (error) {
      console.warn("Error leyendo logo local:", error);
    }
    return null; // Valor por defecto si falla algo
  });

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center">
        <div className="text-center flex flex-col items-center">
          {/* Círculo animado */}
          <div className="relative inline-block">
            <div className="w-24 h-24 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>

            {/* Logo o Icono centrado */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              {customLogo ? (
                <img
                  src={customLogo}
                  alt="Cargando..."
                  className="w-12 h-12 object-contain"
                />
              ) : (
                <ShoppingBag className="text-slate-300" size={32} />
              )}
            </div>
          </div>

          {/* Texto con efecto de pulso */}
          <p className="mt-6 text-slate-500 font-medium text-sm tracking-widest uppercase animate-pulse">
            Cargando Tienda...
          </p>
        </div>
      </div>
    );
  }

  // Spinner pequeño (inline)
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="relative inline-block">
          <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <ShoppingBag className="text-slate-300" size={18} />
          </div>
        </div>
      </div>
    </div>
  );
}
