import React, { useState, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Menu,
  Search,
  X,
  ChevronRight,
  User,
  LogOut,
  Wallet,
} from "lucide-react";

// IMPORTAR FIREBASE
import { db } from "../firebase/config";
import { collection, getDocs } from "firebase/firestore";

// IMPORTAR EL MODAL DE LOGIN
import AuthModal from "./AuthModal";

// IMPORTAR EL CONTEXTO DEL CARRITO
import { useCart } from "../context/CartContext";

export default function Navbar({ onOpenCart }) {
  // USAR CONTEXTO
  const { user, cartCount, logout } = useCart();
  const userSession = user; // Alias para compatibilidad con código existente
  const navigate = useNavigate();

  // --- ESTADOS ---
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showLiveResults, setShowLiveResults] = useState(false);
  const [firebaseProducts, setFirebaseProducts] = useState([]);

  // ESTADO PARA EL MODAL DE LOGIN
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // ESTADO PARA EL MENÚ DESPLEGABLE
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuRef = useRef(null);



  // EFECTO: Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. CARGAR DATOS
  const data = useMemo(() => {
    try {
      const settings = JSON.parse(localStorage.getItem("shopSettings") || "{}");
      return {
        nombre: settings.nombre || "JENTA",
        logo: "/img/logo tienda jenta.svg",
      };
    } catch {
      return { nombre: "JENTA", logo: "/img/logo tienda jenta.svg" };
    }
  }, []);

  // 2. EFECTO: TRAER PRODUCTOS
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
        console.error("Error cargando productos:", error);
      }
    };

    if ((isSearchOpen || isMobileMenuOpen) && firebaseProducts.length === 0) {
      fetchProducts();
    }
  }, [isSearchOpen, isMobileMenuOpen, firebaseProducts.length]);

  // 3. FILTRADO
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
      setIsMobileMenuOpen(false);
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

  // OBTENER INICIAL DEL NOMBRE
  const getUserInitial = () => {
    if (userSession?.name) {
      return userSession.name.charAt(0).toUpperCase();
    }
    return "U";
  };

  // OBTENER SALDO DEL USUARIO
  const getUserBalance = () => {
    return userSession?.balance || 0;
  };

  // CERRAR SESIÓN
  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
    navigate("/");
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm h-20">
        <div className="container mx-auto px-4 md:px-8 h-full flex items-center justify-between">
          {/* LOGO */}
          <Link
            to="/"
            className="flex items-center gap-2 relative z-20 shrink-0"
          >
            <img
              src={data.logo}
              alt="Logo Tienda Jenta"
              className="h-12 w-auto object-contain max-w-[150px]"
            />
          </Link>

          {/* MENÚ CENTRAL - Se mantiene fijo */}
          <div className="hidden md:flex flex-1 justify-center items-center gap-12 text-sm font-medium text-slate-600">
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
          <div className="flex items-center gap-6 relative shrink-0">
            {/* BUSCADOR (PC) - Refactorizado para no empujar el menú */}
            <div className="hidden md:flex items-center justify-end relative min-w-[40px]">
              {isSearchOpen ? (
                <div className="absolute right-0 z-50">
                  <form
                    onSubmit={handleSearchSubmit}
                    className="relative flex items-center animate-in fade-in slide-in-from-right-4 duration-300"
                  >
                    <input
                      autoFocus
                      type="text"
                      placeholder="Buscar producto..."
                      className="bg-slate-50 border border-slate-200 rounded-full py-2 pl-4 pr-10 text-sm outline-none focus:border-sky-500 w-64 md:w-80 transition-all text-slate-700 shadow-sm"
                      value={searchTerm}
                      onChange={handleInputChange}
                      onBlur={() =>
                        setTimeout(() => setShowLiveResults(false), 200)
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
                  {/* RESULTADOS EN VIVO PC */}
                  {showLiveResults && liveResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                      {liveResults.map((product) => (
                        <Link
                          key={product.id}
                          to={`/producto/${product.id}`}
                          onClick={() => setShowLiveResults(false)}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                            <img
                              src={product.images?.[0]}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-700 truncate group-hover:text-sky-600">
                              {product.title}
                            </p>
                            <p className="text-xs text-emerald-600 font-bold">
                              {formatPrice(product.price)}
                            </p>
                          </div>
                        </Link>
                      ))}
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
            </div>

            {/* SALDO PEQUEÑO (SOLO PC) */}
            {userSession && (
              <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 gap-2 shadow-sm">
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                    Saldo en Billetera
                  </span>
                  <span className="text-sm font-black text-[#25D366]">
                    ${getUserBalance().toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* BOTÓN DE USUARIO */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() =>
                  window.innerWidth >= 768 && userSession
                    ? setIsUserMenuOpen(!isUserMenuOpen)
                    : !userSession
                      ? setIsAuthOpen(true)
                      : null
                }
                className={`p-2 rounded-full transition-colors flex items-center gap-2 ${userSession ? "bg-blue-50 text-blue-600 hover:bg-blue-100 shadow-sm border border-blue-100" : "text-slate-600 hover:bg-slate-50"} ${userSession ? "cursor-default md:cursor-pointer" : ""}`}
              >
                {userSession ? (
                  <span className="w-6 h-6 flex items-center justify-center font-bold text-sm bg-blue-600 text-white rounded-full">
                    {getUserInitial()}
                  </span>
                ) : (
                  <User size={20} />
                )}
              </button>

              {isUserMenuOpen && userSession && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50 hidden md:block">
                  <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <p className="font-bold text-slate-800">
                      Hola, {userSession.name.split(" ")[0]}
                    </p>
                    <p className="text-xs text-slate-500">
                      Bienvenido de nuevo
                    </p>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        navigate("/perfil");
                      }}
                      className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 transition-colors text-slate-700"
                    >
                      <User size={18} className="text-blue-600" />
                      <div>
                        <p className="font-medium">Mi Cuenta</p>
                        <p className="text-xs text-slate-400">
                          Gestionar cuenta
                        </p>
                      </div>
                    </button>
                  </div>
                  <div className="border-t border-slate-100 py-2">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-red-50 transition-colors text-red-600"
                    >
                      <LogOut size={18} />{" "}
                      <span className="font-medium">Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

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

            {/* MENÚ HAMBURGUESA */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* PANEL MENÚ MÓVIL */}
        {isMobileMenuOpen && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl md:hidden animate-in fade-in zoom-in-95 duration-300 z-40 rounded-3xl overflow-hidden">
            <div className="flex flex-col p-6 gap-6">
              <div className="relative">
                <form onSubmit={handleSearchSubmit}>
                  <input
                    type="text"
                    placeholder="Buscar..."
                    className="w-full bg-white/40 border border-slate-200/50 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-sky-500"
                    value={searchTerm}
                    onChange={handleInputChange}
                  />
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </form>
                {showLiveResults && liveResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-lg z-50 overflow-hidden">
                    {liveResults.map((p) => (
                      <Link
                        key={p.id}
                        to={`/producto/${p.id}`}
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setShowLiveResults(false);
                        }}
                        className="flex items-center gap-3 p-3 border-b border-slate-50 last:border-0"
                      >
                        <div className="w-8 h-8 rounded bg-slate-50 flex-shrink-0">
                          <img
                            src={p.images?.[0]}
                            className="w-full h-full object-cover"
                            alt=""
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">
                            {p.title}
                          </p>
                          <p className="text-[10px] text-emerald-600 font-bold">
                            {formatPrice(p.price)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {userSession ? (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100/60 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center font-black text-lg shadow-md shadow-blue-200">
                      {getUserInitial()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 line-clamp-1 text-base">
                        {userSession.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Wallet size={13} className="text-emerald-600" />
                        <span className="text-emerald-600 font-bold text-sm">
                          ${getUserBalance().toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigate("/perfil");
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-200"
                  >
                    Gestionar Mi Cuenta <ChevronRight size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsAuthOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-blue-200"
                >
                  <User size={20} /> Iniciar Sesión
                </button>
              )}

              <div className="flex flex-col gap-2">
                <Link
                  to="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-3 hover:bg-white/40 rounded-xl font-medium text-slate-700 flex justify-between items-center group"
                >
                  Inicio <ChevronRight size={16} className="text-slate-300" />
                </Link>
                <Link
                  to="/productos"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-3 hover:bg-white/40 rounded-xl font-medium text-slate-700 flex justify-between items-center group"
                >
                  Productos{" "}
                  <ChevronRight size={16} className="text-slate-300" />
                </Link>
                <Link
                  to="/productos?oferta=true"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-3 hover:bg-white/40 rounded-xl font-medium text-slate-700 flex justify-between items-center group"
                >
                  Ofertas <ChevronRight size={16} className="text-slate-300" />
                </Link>

                {userSession && (
                  <button
                    onClick={handleLogout}
                    className="p-3 mt-4 text-red-600 font-bold flex items-center gap-3 hover:bg-red-50/50 rounded-xl transition-colors border-t border-slate-200/30 pt-4"
                  >
                    <LogOut size={20} />
                    Cerrar Sesión
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
