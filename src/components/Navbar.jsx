import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Menu, Search, X, ChevronRight } from "lucide-react";

// IMPORTAR FIREBASE
import { db } from "../firebase/config";
import { collection, getDocs } from "firebase/firestore";

export default function Navbar({ cartCount, onOpenCart }) {
  const navigate = useNavigate();

  // --- ESTADOS ---
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showLiveResults, setShowLiveResults] = useState(false);
  const [firebaseProducts, setFirebaseProducts] = useState([]);

  // 1. CARGAR DATOS (Referencia física del logo para producción)
  const data = useMemo(() => {
    try {
      const settings = JSON.parse(localStorage.getItem("shopSettings") || "{}");
      return {
        nombre: settings.nombre || "JENTA",
        logo: "/img/logo tienda jenta.svg", // Ruta fija en carpeta public
      };
    } catch {
      return { nombre: "JENTA", logo: "/img/logo tienda jenta.svg" };
    }
  }, []);

  // 2. EFECTO: TRAER PRODUCTOS DE FIREBASE PARA EL BUSCADOR
  useEffect(() => {
    const fetchProducts = async () => {
      if (firebaseProducts.length > 0) return;
      try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const docs = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setFirebaseProducts(docs);
      } catch (error) {
        console.error("Error cargando productos para búsqueda:", error);
      }
    };

    if (isSearchOpen && firebaseProducts.length === 0) {
      fetchProducts();
    }
  }, [isSearchOpen, firebaseProducts.length]);

  // 3. FILTRADO EN TIEMPO REAL
  const liveResults = useMemo(() => {
    if (searchTerm.length < 2) return [];
    return firebaseProducts
      .filter((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 5);
  }, [searchTerm, firebaseProducts]);

  // --- MANEJADORES ---
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/productos?buscar=${searchTerm}`);
      setIsSearchOpen(false);
      setShowLiveResults(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setShowLiveResults(val.length > 1);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm h-20">
      <div className="container mx-auto px-4 md:px-8 h-full flex items-center justify-between">
        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2 relative z-20">
          <img
            src={data.logo}
            alt="Logo Tienda Jenta"
            className="h-12 w-auto object-contain max-w-[150px]"
          />
        </Link>

        {/* MENÚ CENTRAL */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <Link to="/" className="hover:text-sky-500 transition-colors">
            Inicio
          </Link>
          <Link
            to="/productos"
            className="hover:text-sky-500 transition-colors"
          >
            Productos
          </Link>
          <Link
            to="/productos?oferta=true"
            className="hover:text-sky-500 transition-colors"
          >
            Ofertas
          </Link>
        </div>

        {/* ICONOS DERECHA */}
        <div className="flex items-center gap-4 relative">
          {/* BUSCADOR */}
          {isSearchOpen ? (
            <div className="relative z-50">
              <form
                onSubmit={handleSearchSubmit}
                className="relative flex items-center animate-in fade-in slide-in-from-right-4 duration-300"
              >
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar producto..."
                  className="bg-slate-50 border border-slate-200 rounded-full py-2 pl-4 pr-10 text-sm outline-none focus:border-sky-500 w-60 md:w-80 transition-all text-slate-700 shadow-sm"
                  value={searchTerm}
                  onChange={handleInputChange}
                  onBlur={() =>
                    setTimeout(() => {
                      if (!searchTerm) setIsSearchOpen(false);
                      setShowLiveResults(false);
                    }, 200)
                  }
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchTerm("");
                    setShowLiveResults(false);
                  }}
                  className="absolute right-3 text-slate-400 hover:text-sky-500"
                >
                  <X size={16} />
                </button>
              </form>

              {showLiveResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  {liveResults.length > 0 ? (
                    <div className="py-2">
                      <p className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Sugerencias
                      </p>
                      {liveResults.map((product) => (
                        <Link
                          key={product.id}
                          to={`/producto/${product.id}`}
                          onClick={() => {
                            setIsSearchOpen(false);
                            setSearchTerm("");
                          }}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                            {product.images?.[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Search size={14} className="text-slate-300" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-700 truncate group-hover:text-sky-600">
                              {product.title}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatPrice(product.price)}
                            </p>
                          </div>
                          <ChevronRight size={14} className="text-slate-300" />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-sm text-slate-500">
                        No hay coincidencias
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 hover:bg-slate-50 rounded-full text-slate-600 transition-colors"
            >
              <Search size={20} />
            </button>
          )}

          {/* ICONO DE USUARIO ELIMINADO PARA PRIVACIDAD TOTAL */}

          {/* CARRITO */}
          <button
            onClick={onOpenCart}
            className="p-2 bg-slate-900 text-white rounded-full hover:bg-sky-500 transition-colors relative group"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold group-hover:bg-white group-hover:text-sky-500 transition-colors">
                {cartCount}
              </span>
            )}
          </button>

          <button className="md:hidden p-2 text-slate-600">
            <Menu size={24} />
          </button>
        </div>
      </div>
    </nav>
  );
}
