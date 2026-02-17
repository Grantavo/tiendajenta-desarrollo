import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  UserCog,
  Settings,
  LogOut,
  Tag,
  CreditCard,
  Truck,
  MessageSquare,
  Palette,
  X,
} from "lucide-react";

// 1. IMPORTAR EL HOOK DE PERMISOS
import { usePermissions } from "../../hooks/usePermissions";

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { hasPermission } = usePermissions();

  const getSettingsFromStorage = () => {
    try {
      const saved = localStorage.getItem("shopSettings");
      return saved ? JSON.parse(saved) : { nombre: "GENTA", logo: null };
    } catch {
      return { nombre: "GENTA", logo: null };
    }
  };

  const [shopSettings, setShopSettings] = useState(getSettingsFromStorage);

  useEffect(() => {
    const handleStorageUpdate = () => {
      setShopSettings(getSettingsFromStorage());
    };
    window.addEventListener("storage", handleStorageUpdate);
    return () => window.removeEventListener("storage", handleStorageUpdate);
  }, []);

  // --- LÓGICA DE FILTRADO CORREGIDA ---
  const allowedMenu = useMemo(() => {
    // Definimos la configuración dentro para eliminar el error de dependencia
    const fullMenuConfig = [
      {
        title: "PRINCIPAL",
        items: [
          {
            id: "dashboard",
            path: "/admin",
            label: "Dashboard",
            icon: <LayoutDashboard size={20} />,
          },
        ],
      },
      {
        title: "GESTIÓN",
        items: [
          {
            id: "pedidos",
            path: "/admin/pedidos",
            label: "Pedidos",
            icon: <ShoppingBag size={20} />,
          },
          {
            id: "productos",
            path: "/admin/productos",
            label: "Productos",
            icon: <Package size={20} />,
          },
          {
            id: "categorias",
            path: "/admin/categorias",
            label: "Categorías",
            icon: <Tag size={20} />,
          },
          {
            id: "clientes",
            path: "/admin/clientes",
            label: "Clientes",
            icon: <Users size={20} />,
          },
          {
            id: "usuarios",
            path: "/admin/usuarios",
            label: "Usuarios",
            icon: <UserCog size={20} />,
          },
        ],
      },
      {
        title: "TIENDA",
        items: [
          {
            id: "banners",
            path: "/admin/banners",
            label: "Diseño",
            icon: <Palette size={20} />,
          },
          {
            id: "marketing",
            path: "/admin/marketing",
            label: "Marketing",
            icon: <MessageSquare size={20} />,
          },
        ],
      },
      {
        title: "CONFIGURACIÓN",
        items: [
          {
            id: "ajustes",
            path: "/admin/pagos",
            label: "Pagos",
            icon: <CreditCard size={20} />,
          },
          {
            id: "ajustes",
            path: "/admin/envios",
            label: "Envíos",
            icon: <Truck size={20} />,
          },
          {
            id: "ajustes",
            path: "/admin/ajustes",
            label: "Ajustes",
            icon: <Settings size={20} />,
          },
        ],
      },
    ];

    return fullMenuConfig
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => hasPermission(item.id)),
      }))
      .filter((group) => group.items.length > 0);
  }, [hasPermission]);

  return (
    <>
      {/* MOBILE OVERLAY */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      <aside 
        className={`fixed lg:relative z-50 w-72 h-screen flex flex-col transition-transform duration-300 border-r border-slate-200 bg-slate-100/80 backdrop-blur-xl ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
      {/* LOGO DINÁMICO */}
      <div className="h-24 flex items-center justify-between px-8">
        {shopSettings.logo ? (
          <img
            src={shopSettings.logo}
            alt="Logo Tienda"
            className="max-h-12 w-auto object-contain transition-all duration-300"
          />
        ) : (
          <span className="text-2xl font-black tracking-tighter text-slate-800 uppercase truncate">
            {shopSettings.nombre || "GENTA"}
            <span className="text-red-600">.ADMIN</span>
          </span>
        )}
        {/* CLOSE BUTTON MOBILE */}
        <button onClick={onClose} className="lg:hidden text-slate-500 hover:text-red-500">
          <X size={24} />
        </button>
      </div>

      {/* MENÚ FILTRADO */}
      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-8 no-scrollbar">
        {allowedMenu.map((group, index) => (
          <div key={index}>
            <h3 className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">
              {group.title}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`group flex items-center gap-3 px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                        isActive
                          ? "bg-white text-red-600 shadow-sm ring-1 ring-slate-200"
                          : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                      }`}
                    >
                      <span
                        className={`transition-colors duration-200 ${
                          isActive
                            ? "text-red-600"
                            : "text-slate-400 group-hover:text-slate-600"
                        }`}
                      >
                        {item.icon}
                      </span>
                      {item.label}
                      {isActive && (
                        <div className="ml-auto w-2 h-2 rounded-full bg-red-600 shadow-sm animate-pulse"></div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* FOOTER USER */}
      <div className="p-6 border-t border-slate-200/50">
        <a
          href="/?preview=admin"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-slate-900 hover:scale-[1.02] transition-all duration-300"
        >
          <LogOut size={18} />
          <span>Ver Tienda</span>
        </a>
      </div>
    </aside>
    </>
  );
}
