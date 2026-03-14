import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Folder, PackageOpen, AlertCircle } from "lucide-react";
import { db } from "../../firebase/config";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import ProductCard from "../../components/ProductCard";

export default function CategoryPage() {
  const { id } = useParams();
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubcatId, setActiveSubcatId] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      if (!id || id === "undefined") {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const catSnap = await getDoc(doc(db, "categories", id));

        if (catSnap.exists()) {
          setCategory({ id: catSnap.id, ...catSnap.data() });

          const q = query(
            collection(db, "products"),
            where("categoryId", "==", id)
          );
          const querySnapshot = await getDocs(q);
          setProducts(
            querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
          );
        }
      } catch (error) {
        console.error("Error cargando categoría:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  // 🧠 NORMALIZACIÓN SEGURA DE SUBCATEGORÍAS
  const normalizedSubcategories =
    category?.subcategories
      ?.filter((sub) => sub && sub.id)
      ?.map((sub) => ({
        id: sub.id,
        name: sub.name || sub.nombre || "Sin nombre",
      })) || [];

  const activeSubcatName = normalizedSubcategories.find(s => s.id === activeSubcatId)?.name;

  if (id === "undefined") {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
        <h2 className="text-xl font-bold">Error de enlace</h2>
        <p className="text-slate-500 mb-6">
          El menú principal no está enviando el ID de la categoría
          correctamente.
        </p>
        <Link to="/" className="bg-slate-900 text-white px-6 py-2 rounded-lg">
          Volver al Inicio
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-20 text-center font-bold text-slate-400">
        CARGANDO...
      </div>
    );
  }

  if (!category) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-500">
          No se encontró la información de esta categoría.
        </p>
        <Link to="/" className="text-blue-600 underline">
          Regresar
        </Link>
      </div>
    );
  }

  // 🔧 FIX: Filtrado correcto de productos
  const filteredProducts = activeSubcatId
    ? // Si hay subcategoría activa: mostrar solo productos de ESA subcategoría
      products.filter((p) => p.subcategoryId === activeSubcatId)
    : // Si NO hay subcategoría activa: mostrar solo productos SIN subcategoría asignada
      products.filter((p) => !p.subcategoryId);

  return (
    <div className="container mx-auto px-4 py-8">
      <Helmet>
        <title>{`${activeSubcatName || category.name || category.nombre} | Tienda Jenta`}</title>
        <meta
          name="description"
          content={`Explora lo mejor en ${activeSubcatName || category.name} en Tienda Jenta. Tecnología, ferretería y más con envío a toda Colombia.`}
        />
      </Helmet>
      <h1 className="text-3xl font-black text-center mb-8 uppercase">
        {activeSubcatName || category.name || category.nombre}
      </h1>

      {/* SUBCATEGORÍAS */}
      {!activeSubcatId && normalizedSubcategories.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {normalizedSubcategories.map((sub) => (
            <div
              key={sub.id}
              onClick={() => setActiveSubcatId(sub.id)}
              className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all text-center"
            >
              <Folder className="mx-auto mb-2 text-blue-500" />
              <h3 className="text-xs font-bold uppercase">{sub.name}</h3>
            </div>
          ))}
        </div>
      )}

      {/* VOLVER */}
      <div className="flex flex-wrap gap-4 mb-6">
        {activeSubcatId && (
          <button
            onClick={() => setActiveSubcatId(null)}
            className="text-sm font-bold text-blue-600 hover:underline"
          >
            ← Ver todas las subcategorías
          </button>
        )}
        <Link
          to="/"
          className="text-sm font-bold text-slate-500 hover:text-slate-800 hover:underline"
        >
          Ir a todas las categorías
        </Link>
      </div>

      {/* PRODUCTOS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((p) => <ProductCard key={p.id} product={p} />)
        ) : (
          <div className="col-span-full text-center py-10 opacity-50">
            <PackageOpen className="mx-auto mb-2" />
            <p>No hay productos registrados en esta selección.</p>
          </div>
        )}
      </div>
    </div>
  );
}
