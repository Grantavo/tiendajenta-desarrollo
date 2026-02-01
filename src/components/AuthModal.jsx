import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// FIREBASE
import { db } from "../firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function AuthModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  // --- ESTADOS ---
  const [view, setView] = useState("login"); // 'login' o 'register'
  const [loading, setLoading] = useState(false);

  // Datos del formulario
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });

  if (!isOpen) return null;

  // --- LÓGICA DE LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Buscar usuario
      const q = query(
        collection(db, "users"),
        where("email", "==", formData.email.trim()),
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error("Usuario no encontrado. ¿Quieres registrarte?");
        setLoading(false);
        return;
      }

      const docSnap = querySnapshot.docs[0];
      const userData = { id: docSnap.id, ...docSnap.data() };

      // 2. Validar contraseña
      if (userData.password !== formData.password) {
        toast.error("Contraseña incorrecta");
        setLoading(false);
        return;
      }

      // 3. Guardar sesión
      const safeUser = { ...userData };
      delete safeUser.password;
      sessionStorage.setItem("shopUser", JSON.stringify(safeUser));

      toast.success(`Bienvenido, ${safeUser.name}`);

      // 4. Cargar roles y redirigir
      try {
        const rolesSnap = await getDocs(collection(db, "roles"));
        const rolesData = rolesSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        localStorage.setItem("shopRoles", JSON.stringify(rolesData));

        if (userData.roleId) {
          navigate("/admin");
        } else {
          window.location.reload();
        }
      } catch (err) {
        // --- CORRECCIÓN AQUÍ: Usamos la variable 'err' para que no salga el error ---
        console.error("Error cargando roles, recargando página...", err);
        window.location.reload();
      }

      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE REGISTRO ---
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const q = query(
        collection(db, "users"),
        where("email", "==", formData.email.trim()),
      );
      const exists = await getDocs(q);

      if (!exists.empty) {
        toast.warning(
          "Este correo ya está registrado. Por favor inicia sesión.",
        );
        setView("login");
        setLoading(false);
        return;
      }

      const cleanPhone = formData.phone.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        toast.error("Por favor ingresa un número de celular válido.");
        setLoading(false);
        return;
      }

      const newUser = {
        name: formData.name,
        email: formData.email.trim(),
        password: formData.password,
        phone: cleanPhone,
        role: "client",
        createdAt: serverTimestamp(),
        walletBalance: 0,
      };

      const docRef = await addDoc(collection(db, "users"), newUser);

      const safeUser = { id: docRef.id, ...newUser };
      delete safeUser.password;
      sessionStorage.setItem("shopUser", JSON.stringify(safeUser));

      toast.success(
        "¡Cuenta creada con éxito! Te hemos regalado tu billetera virtual.",
      );
      window.location.reload();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Error al registrar usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors z-10"
        >
          <X size={20} className="text-slate-500" />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-slate-800">
              {view === "login" ? "¡Hola de nuevo!" : "Crear Cuenta"}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {view === "login"
                ? "Ingresa para acceder a tus pedidos y saldo."
                : "Regístrate para usar la billetera virtual."}
            </p>
          </div>

          <form
            onSubmit={view === "login" ? handleLogin : handleRegister}
            className="space-y-4"
          >
            {view === "register" && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="text"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-700"
                    placeholder="Tu nombre"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                Correo
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="email"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-700"
                  placeholder="nombre@ejemplo.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>

            {view === "register" && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                  Celular / WhatsApp
                </label>
                <div className="relative">
                  <Phone
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="tel"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-700"
                    placeholder="300 123 4567"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                <p className="text-[10px] text-slate-400 ml-1">
                  * Necesario para recargar saldo.
                </p>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="password"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-700"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : view === "login" ? (
                "Ingresar"
              ) : (
                "Registrarme"
              )}
              {!loading && <ChevronRight size={18} />}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              {view === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
              <button
                onClick={() => setView(view === "login" ? "register" : "login")}
                className="text-blue-600 font-bold hover:underline"
              >
                {view === "login" ? "Crea tu cuenta gratis" : "Inicia Sesión"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
