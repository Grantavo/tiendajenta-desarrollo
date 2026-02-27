import React, { useState, useEffect } from "react";
import { ShoppingBag } from "lucide-react";
import { db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";

export default function LoadingSpinner({ fullScreen = false }) {
  // Fase 1: Leer instantáneamente de localStorage (sin re-render)
  const getLogoFromCache = () => {
    try {
      // 1. Clave directa (la más confiable y rápida)
      const directLogo = localStorage.getItem("shopLogo");
      if (directLogo) return directLogo;
      // 2. Respaldo: objeto completo de settings
      const stored = localStorage.getItem("shopSettings");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.logo || null;
      }
    } catch (_) {}
    return null;
  };

  const [customLogo, setCustomLogo] = useState(getLogoFromCache);

  // Fase 2: Si no hay logo en cache, buscar en Firebase como respaldo
  useEffect(() => {
    if (customLogo) return; // Ya tenemos logo, no necesitamos Firebase
    const fetchLogo = async () => {
      try {
        const docSnap = await getDoc(doc(db, "settings", "shop"));
        if (docSnap.exists()) {
          const logo = docSnap.data().logo;
          if (logo) {
            setCustomLogo(logo);
            // Guardar en cache para la próxima vez
            const current = JSON.parse(localStorage.getItem("shopSettings") || "{}");
            localStorage.setItem("shopSettings", JSON.stringify({ ...current, logo }));
          }
        }
      } catch (_) {}
    };
    fetchLogo();
  }, []);

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
