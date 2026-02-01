import React from "react";

export default function CategoryFilter({
  categorias,
  filtroActivo,
  setFiltroActivo,
  subcategoriaActiva,
  setSubcategoriaActiva,
}) {
  // Obtenemos la categoría que coincide con el ID actual
  const categoriaActual = categorias.find((c) => c.id === filtroActivo);

  return (
    <div className="flex flex-col items-center gap-6 mb-8">
      {/* Botones de Categorías Principales */}
      <div className="flex flex-wrap justify-center gap-4">
        {categorias.map((categoria) => (
          <button
            key={categoria.id}
            onClick={() => {
              setFiltroActivo(categoria.id);
              if (setSubcategoriaActiva) setSubcategoriaActiva("all");
            }}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all transform hover:scale-105 ${
              filtroActivo === categoria.id
                ? "bg-red-600 text-white shadow-lg shadow-red-500/30"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {/* CORRECCIÓN: Usamos 'nombre' que es como está en tu Firebase */}
            {categoria.nombre || categoria.name}
          </button>
        ))}
      </div>

      {/* Fila de Subcategorías (solo si la categoría actual tiene subcategorías) */}
      {categoriaActual?.subcategories?.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 animate-in fade-in slide-in-from-top-2">
          {categoriaActual.subcategories.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSubcategoriaActiva(sub.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subcategoriaActiva === sub.id
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {sub.name}
            </button>
          ))}

          <button
            onClick={() => setSubcategoriaActiva("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subcategoriaActiva === "all"
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            Ver Todo
          </button>
        </div>
      )}
    </div>
  );
}
