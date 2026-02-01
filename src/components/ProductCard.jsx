// src/components/ProductCard.jsx
import React from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, Search } from "lucide-react";
// Importamos el hook que contiene la lógica de negocio
import { useProductPrice } from "../hooks/useProductPrice";

export default function ProductCard({ product }) {
  // 1. Lógica extraída al Hook (Rendimiento + Limpieza)
  const {
    formattedPrice,
    formattedOldPrice,
    hasDiscount,
    discountPercent,
    isOutOfStock,
  } = useProductPrice(product);

  // 2. Datos simples de UI
  const brand = product.brand || "Genérica";
  const title = product.title || "Sin Título";
  const imageSrc =
    product.images && product.images[0] ? product.images[0] : null;

  return (
    <div className="bg-white rounded-[20px] border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col h-full relative">
      {/* BADGE: Oferta */}
      {hasDiscount && !isOutOfStock && (
        <span className="absolute top-4 left-4 bg-[#DC2626] text-white text-[11px] font-bold px-2.5 py-1 rounded-md z-10 shadow-sm">
          -{discountPercent}% OFF
        </span>
      )}

      {/* BADGE: Agotado */}
      {isOutOfStock && (
        <div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center backdrop-blur-[2px]">
          <span className="bg-slate-800 text-white font-bold px-4 py-2 rounded-full text-xs shadow-lg">
            AGOTADO
          </span>
        </div>
      )}

      {/* IMAGEN */}
      <div className="aspect-square bg-[#F8FAFC] relative overflow-hidden flex items-center justify-center p-6">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={title}
            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="text-slate-300 font-bold flex flex-col items-center">
            <Search size={32} />
            <span className="text-xs mt-2">Sin foto</span>
          </div>
        )}
      </div>

      {/* INFO DEL PRODUCTO */}
      <div className="p-5 flex flex-col flex-1">
        {/* Marca */}
        <p className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">
          {brand}
        </p>

        {/* Título */}
        <Link
          to={`/producto/${product.id}`}
          className="group-hover:text-blue-600 transition-colors mb-3"
        >
          <h3 className="font-bold text-slate-800 text-[15px] leading-snug line-clamp-2 min-h-[2.5rem]">
            {title}
          </h3>
        </Link>

        {/* Precios (Usando los valores ya formateados del hook) */}
        <div className="mb-4">
          {hasDiscount && (
            <span className="block text-sm text-slate-400 line-through mb-0.5 font-medium">
              {formattedOldPrice}
            </span>
          )}
          <span
            className={`block font-black text-xl ${
              hasDiscount ? "text-[#DC2626]" : "text-slate-800"
            }`}
          >
            {formattedPrice}
          </span>
        </div>

        {/* BOTÓN VER DETALLE */}
        <Link to={`/producto/${product.id}`} className="mt-auto">
          <button
            disabled={isOutOfStock}
            className="w-full bg-[#F1F5F9] text-slate-700 font-bold py-3 rounded-xl text-sm hover:bg-[#0F172A] hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={18} />
            {isOutOfStock ? "Sin Stock" : "Ver Detalle"}
          </button>
        </Link>
      </div>
    </div>
  );
}
