import React, { useMemo } from "react"; // 1. Traemos useMemo
import { useLocation, Link } from "react-router-dom";
import { Tag, X, Search } from "lucide-react";

// 2. Ya no importamos nada de Firebase aquí. ¡El componente es agnóstico a la DB!
// import { db } ... (ELIMINADO)

// 3. Importamos nuestro Hook
import { useProducts } from "../../hooks/useProducts";
import ProductCard from "../../components/ProductCard";

export default function ShopProducts() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const searchTerm = queryParams.get("buscar") || "";
  const isOfferMode = queryParams.get("oferta") === "true";

  // 4. USAMOS EL HOOK: Una línea para gobernar todos los datos
  const { products, loading, error } = useProducts();

  // 5. OPTIMIZACIÓN con useMemo:
  // "Memoriza" el resultado del filtrado. Solo se vuelve a calcular si
  // cambia la lista de 'products', el 'searchTerm' o el modo 'isOfferMode'.
  // Esto hace que la app se sienta más rápida.
  const filteredProducts = useMemo(() => {
    let result = products;

    if (searchTerm) {
      result = result.filter((p) =>
        p.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (isOfferMode) {
      result = result.filter((p) => {
        const price = Number(p.price) || 0;
        const oldPrice = Number(p.oldPrice) || 0;
        return oldPrice > price;
      });
    }

    return result;
  }, [products, searchTerm, isOfferMode]);

  // Manejo de errores (Mejora de UX)
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">
        Ocurrió un error cargando los productos: {error}
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans">
      {/* HEADER */}
      <div className="bg-white shadow-sm border-b border-slate-100 py-8 px-4">
        <div className="container mx-auto">
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight mb-2 flex items-center gap-2">
            {isOfferMode ? (
              <>
                <Tag className="text-red-600" />{" "}
                <span className="text-red-600">Ofertas</span>
              </>
            ) : searchTerm ? (
              <span>Buscando: "{searchTerm}"</span>
            ) : (
              "Todos los Productos"
            )}
          </h1>
          <p className="text-slate-500 text-sm">
            {/* Usamos filteredProducts en lugar de products */}
            {loading
              ? "Cargando..."
              : `${filteredProducts.length} productos disponibles`}
          </p>
          {(isOfferMode || searchTerm) && (
            <Link
              to="/productos"
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 mt-2 hover:text-red-500"
            >
              <X size={12} /> Limpiar filtros
            </Link>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* GRILLA DE PRODUCTOS */}
        {loading ? (
          // Reto futuro: Cambiar esto por un Skeleton
          <div className="text-center py-20 text-slate-400">
            Cargando catálogo...
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <Search className="mx-auto text-slate-300 mb-4" size={48} />
            <h3 className="text-xl font-bold text-slate-600">
              No hay productos
            </h3>
            <Link
              to="/productos"
              className="mt-4 inline-block text-blue-600 font-bold text-sm hover:underline"
            >
              Ver todo
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
