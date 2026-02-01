import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Wallet,
  Lock,
  UserCog,
  ChevronRight,
  LogOut,
  ArrowUpCircle,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

// FIREBASE
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";

// MODALES
import RechargeModal from "../../components/RechargeModal";
import EditProfileModal from "../../components/EditProfileModal";
import MyOrdersModal from "../../components/MyOrdersModal";
import ChangePasswordModal from "../../components/ChangePasswordModal";

export default function ClientDashboard() {
  const navigate = useNavigate();

  // ESTADOS DE LOS MODALES
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);

  // 1. INICIALIZACIÓN PEREZOSA (LAZY INIT)
  const [user, setUser] = useState(() => {
    try {
      const session = sessionStorage.getItem("shopUser");
      return session ? JSON.parse(session) : null;
    } catch (e) {
      console.error("Error recuperando sesión:", e);
      return null;
    }
  });

  // 2. EFECTO #1: SOLO SEGURIDAD (REDIRECCIÓN)
  // Este efecto solo se preocupa de si el usuario existe o no.
  useEffect(() => {
    if (!user) {
      toast.error("Debes iniciar sesión para ver tu cuenta");
      navigate("/");
    }
  }, [user, navigate]); // Aquí sí podemos poner 'user' sin riesgo de bucles de datos

  // 3. EFECTO #2: SOLO DATOS EN VIVO (FIREBASE)
  // Este efecto depende EXCLUSIVAMENTE del ID. Si el saldo cambia, el ID sigue siendo el mismo,
  // por lo tanto, este efecto NO se reinicia (evitando el bucle), pero el onSnapshot sí actualiza el estado.
  useEffect(() => {
    if (!user?.id) return; // Si no hay ID, no hacemos nada

    try {
      const userRef = doc(db, "users", user.id);

      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const updatedData = { id: docSnap.id, ...docSnap.data() };

          // Actualizamos el estado visual
          setUser(updatedData);

          // Actualizamos la sesión local
          sessionStorage.setItem("shopUser", JSON.stringify(updatedData));
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error conectando con base de datos en vivo", error);
    }
  }, [user?.id]); // CORRECCIÓN: Dependemos solo del ID, que es un string estable.

  if (!user) return null;

  // --- CONFIGURACIÓN DE TARJETAS ---
  const menuItems = [
    {
      title: "Mis Pedidos",
      desc: "Rastrea tus compras recientes",
      icon: <Package size={32} />,
      color: "text-blue-600",
      bg: "bg-blue-50",
      action: () => setIsOrdersOpen(true),
    },
    {
      title: "Billetera Virtual",
      desc: `Saldo disponible: $${(user.walletBalance || 0).toLocaleString()}`,
      icon: <Wallet size={32} />,
      color: "text-green-600",
      bg: "bg-green-50",
      action: () => setIsRechargeOpen(true),
      isWallet: true,
    },
    {
      title: "Mi Panel de Inversión",
      desc: "Gestiona y crece tu capital",
      icon: <TrendingUp size={32} />,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      action: () => toast.success("Panel de Inversiones: Muy pronto 🚀"),
    },
    {
      title: "Seguridad",
      desc: "Cambiar contraseña",
      icon: <Lock size={32} />,
      color: "text-orange-600",
      bg: "bg-orange-50",
      action: () => setIsSecurityOpen(true),
    },
    {
      title: "Mis Datos",
      desc: "Editar perfil y dirección",
      icon: <UserCog size={32} />,
      color: "text-purple-600",
      bg: "bg-purple-50",
      action: () => setIsProfileOpen(true),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-10 max-w-7xl">
      {/* ENCABEZADO */}
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-3xl font-black text-slate-800">
          Hola, {user.name.split(" ")[0]} 👋
        </h1>
        <p className="text-slate-500 mt-2">
          Bienvenido a tu oficina virtual. Aquí tienes el control de todo.
        </p>
      </div>

      {/* GRID DE OPCIONES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={item.action}
            className="group relative flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 text-center w-full"
          >
            {/* Icono */}
            <div
              className={`p-4 rounded-xl ${item.bg} ${item.color} mb-4 transition-transform group-hover:scale-110 duration-300`}
            >
              {item.icon}
            </div>

            <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
              {item.title}
            </h3>

            {/* LÓGICA VISUAL BILLETERA */}
            {item.isWallet ? (
              <>
                <p className="text-lg font-black text-green-600 mt-1">
                  ${(user.walletBalance || 0).toLocaleString()}
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">
                  <ArrowUpCircle size={14} /> Recargar
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 mt-2 font-medium">
                {item.desc}
              </p>
            )}

            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300 text-blue-400">
              <ChevronRight size={20} />
            </div>
          </button>
        ))}
      </div>

      {/* FOOTER */}
      <div className="mt-12 border-t border-slate-100 pt-8 flex justify-center">
        <button
          onClick={() => {
            sessionStorage.removeItem("shopUser");
            navigate("/");
            window.location.reload();
          }}
          className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          Cerrar Sesión
        </button>
      </div>

      {/* MODALES */}
      <RechargeModal
        isOpen={isRechargeOpen}
        onClose={() => setIsRechargeOpen(false)}
        user={user}
      />

      <EditProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
      />

      <MyOrdersModal
        isOpen={isOrdersOpen}
        onClose={() => setIsOrdersOpen(false)}
        user={user}
      />

      <ChangePasswordModal
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
        user={user}
      />
    </div>
  );
}
