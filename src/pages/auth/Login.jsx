import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, ChevronRight, AlertCircle } from "lucide-react";

// FIREBASE
import { db } from "../../firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";

// 1. IMPORTAR SONNER PARA UNA MEJOR EXPERIENCIA
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    const session = sessionStorage.getItem("shopUser");
    if (session) {
      navigate("/admin", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Consultar Usuario
      const q = query(
        collection(db, "users"),
        where("email", "==", formData.email.trim())
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("Credenciales inválidas. Verifica tu correo.");
        setLoading(false);
        return;
      }

      const docSnap = querySnapshot.docs[0];
      const userData = { id: docSnap.id, ...docSnap.data() };

      // 2. Validar Contraseña
      if (userData.password !== formData.password) {
        setError("Contraseña incorrecta.");
        setLoading(false);
        return;
      }

      // --- PASO CRÍTICO PARA PERMISOS ---
      // 3. Descargar los ROLES actuales de la nube antes de entrar
      // Esto asegura que el Sidebar tenga la "llave" para abrir los menús
      const rolesSnap = await getDocs(collection(db, "roles"));
      const rolesData = rolesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      localStorage.setItem("shopRoles", JSON.stringify(rolesData));

      // 4. Sanitizar y Guardar Sesión
      const safeUser = { ...userData };
      delete safeUser.password;
      sessionStorage.setItem("shopUser", JSON.stringify(safeUser));

      toast.success(`¡Bienvenido de nuevo, ${safeUser.name}!`);

      // 5. Redirigir
      navigate("/admin", { replace: true });
    } catch (err) {
      console.error("Error login:", err);
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl border border-slate-100">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-slate-800 mb-2">
            Bienvenido
          </h1>
          <p className="text-slate-400">Panel Administrativo</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 text-red-500 p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="login-email"
              className="text-xs font-bold text-slate-500 uppercase ml-1"
            >
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <input
                id="login-email"
                name="email"
                type="email"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-medium text-slate-700"
                placeholder="admin@ejemplo.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="login-password"
              className="text-xs font-bold text-slate-500 uppercase ml-1"
            >
              Contraseña
            </label>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <input
                id="login-password"
                name="password"
                type="password"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-medium text-slate-700"
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
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Verificando..." : "Ingresar"}
            {!loading && <ChevronRight size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
}
