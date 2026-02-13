import React, { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/admin/Sidebar";
import {
  Search,
  User,
  ChevronDown,
  LogOut,
  Moon,
  Sun,
  Camera,
  Menu,
} from "lucide-react";

import { db } from "../firebase/config";
import { doc, updateDoc, collection, getDocs } from "firebase/firestore";
import { toast } from "sonner";
import useIdleTimer from "../hooks/useIdleTimer";
import { useCallback } from "react";

export default function AdminLayout() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(
    JSON.parse(sessionStorage.getItem("shopUser") || "{}")
  );

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [firebaseData, setFirebaseData] = useState({
    products: [],
    users: [],
    orders: [],
  });
  const [results, setResults] = useState({
    products: [],
    users: [],
    orders: [],
  });

  const fileInputRef = useRef(null);

  // --- NUEVO: AUTO LOGOUT POR INACTIVIDAD (15 MINUTOS) ---
  const handleIdle = useCallback(() => {
    toast.warning("Sesión cerrada por inactividad");
    sessionStorage.removeItem("shopUser");
    navigate("/login");
  }, [navigate]);

  useIdleTimer({
    timeout: 1000 * 60 * 15, // 15 minutos
    onIdle: handleIdle,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prodSnap, userSnap, orderSnap] = await Promise.all([
          getDocs(collection(db, "products")),
          getDocs(collection(db, "users")),
          getDocs(collection(db, "orders")),
        ]);
        setFirebaseData({
          products: prodSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          users: userSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          orders: orderSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        });
      } catch (e) {
        console.error(e);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const checkForModal = () => {
      const modalExists = document.querySelector(".fixed.inset-0.z-50");
      setIsHeaderVisible(!modalExists);
    };

    const observer = new MutationObserver(checkForModal);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  const handleLogout = () => {
    if (window.confirm("¿Cerrar sesión?")) {
      sessionStorage.removeItem("shopUser");
      navigate("/login");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      const updatedUser = { ...currentUser, photoURL: base64String };

      setCurrentUser(updatedUser);
      sessionStorage.setItem("shopUser", JSON.stringify(updatedUser));

      if (currentUser.id) {
        await updateDoc(doc(db, "users", currentUser.id), {
          photoURL: base64String,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term.length > 1) {
      const lower = term.toLowerCase();
      setResults({
        products: firebaseData.products
          .filter((p) => p.title?.toLowerCase().includes(lower))
          .slice(0, 3),
        users: firebaseData.users
          .filter((u) => u.name?.toLowerCase().includes(lower))
          .slice(0, 3),
        orders: firebaseData.orders
          .filter(
            (o) =>
              String(o.id).includes(lower) ||
              o.client?.toLowerCase().includes(lower)
          )
          .slice(0, 3),
      });
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  };

  const goToResult = (path) => {
    navigate(path);
    setShowResults(false);
    setSearchTerm("");
  };

  return (
    <div
      className={`flex h-screen bg-slate-50 ${
        isDarkMode ? "dark bg-slate-900 text-white" : ""
      }`}
    >
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {isHeaderVisible && (
          <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm z-20 relative animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden text-slate-500 hover:text-slate-700"
              >
                <Menu size={24} />
              </button>

              <div className="relative w-80 hidden sm:block">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={18} />
              </div>
              <input
                id="admin-search" // Agregado para quitar advertencia
                name="admin-search" // Agregado para quitar advertencia
                type="text"
                placeholder="Buscar..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-blue-500 text-slate-700"
                value={searchTerm}
                onChange={handleSearch}
              />

              {showResults && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50">
                  {results.products.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => goToResult("/admin/productos")}
                      className="p-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
                    >
                      {p.title}
                    </div>
                  ))}
                  {results.users.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => goToResult("/admin/usuarios")}
                      className="p-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
                    >
                      {u.name}
                    </div>
                  ))}
                  {results.orders.map((o) => (
                    <div
                      key={o.id}
                      onClick={() => goToResult("/admin/pedidos")}
                      className="p-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
                    >
                      Pedido #{o.id}
                    </div>
                  ))}
                  {!results.products.length &&
                    !results.users.length &&
                    !results.orders.length && (
                      <div className="p-2 text-xs text-center text-slate-400">
                        Sin resultados
                      </div>
                    )}
                </div>
              )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 text-slate-700 font-bold text-sm"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        className="w-full h-full object-cover"
                        alt="User"
                      />
                    ) : (
                      <User className="p-1" />
                    )}
                  </div>
                  {currentUser.name?.split(" ")[0]}
                  <ChevronDown size={14} />
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 shadow-xl rounded-xl p-2 z-50">
                    <div
                      className="p-4 text-center border-b border-slate-100 mb-2 cursor-pointer relative group"
                      onClick={() => fileInputRef.current.click()}
                    >
                      <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 overflow-hidden relative">
                        {currentUser.photoURL ? (
                          <img
                            src={currentUser.photoURL}
                            className="w-full h-full object-cover"
                            alt="Profile"
                          />
                        ) : (
                          <User className="p-2" />
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Camera className="text-white" size={16} />
                        </div>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        className="hidden"
                        accept="image/*"
                      />
                      <p className="mt-2 text-sm font-bold text-slate-800">
                        {currentUser.name}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
                    >
                      {isDarkMode ? <Sun size={16} /> : <Moon size={16} />} Tema
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <LogOut size={16} /> Salir
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 relative z-10">
          <Outlet />
        </main>
      </div>

      {/* CORRECCIÓN: Se quitó el atributo 'jsx' que causaba el error en consola */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}
