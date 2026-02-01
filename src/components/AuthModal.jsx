import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Mail, Lock, User, Phone, Loader2 } from "lucide-react";
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
  const [view, setView] = useState("login");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });

  if (!isOpen) return null;

  // --- 1. VALIDACIONES ESTRICTAS AL ENVIAR ---
  const validateInputs = () => {
    // Email: Regex estándar para correos
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.error("Ingresa un correo válido (ej: usuario@gmail.com).");
      return false;
    }

    // Contraseña: Mínimo 6 caracteres
    if (formData.password.trim().length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return false;
    }

    // Solo para Registro
    if (view === "register") {
      // Nombre: Mínimo 3 letras
      if (formData.name.trim().length < 3) {
        toast.error("El nombre es muy corto.");
        return false;
      }

      // Celular: Exactamente 10 números
      if (formData.phone.length !== 10) {
        toast.error("El celular debe tener 10 dígitos exactos.");
        return false;
      }
    }

    return true;
  };

  // --- 2. CONTROL ESTRICTO DE INPUTS (MÁSCARAS) ---
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Si es Celular: Solo permitir números y máximo 10
    if (name === "phone") {
      const onlyNums = value.replace(/\D/g, ""); // Borra cualquier letra
      if (onlyNums.length <= 10) {
        setFormData({ ...formData, phone: onlyNums });
      }
      return;
    }

    // Si es Nombre: Solo permitir letras y espacios (no números)
    if (name === "name") {
      const onlyLetters = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
      setFormData({ ...formData, name: onlyLetters });
      return;
    }

    // Resto de campos normal
    setFormData({ ...formData, [name]: value });
  };

  // --- LÓGICA LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateInputs()) return; // Frena si hay error

    setLoading(true);

    try {
      const email = formData.email.trim();

      // Buscar en Clients
      let q = query(collection(db, "clients"), where("email", "==", email));
      let snap = await getDocs(q);
      let isStaff = false;

      // Buscar en Users (Admin)
      if (snap.empty) {
        q = query(collection(db, "users"), where("email", "==", email));
        snap = await getDocs(q);
        isStaff = true;
      }

      if (snap.empty) {
        toast.error("Usuario no encontrado.");
        setLoading(false);
        return;
      }

      const userData = snap.docs[0].data();

      // Validar password (simple)
      if (userData.password !== formData.password.trim()) {
        toast.error("Contraseña incorrecta.");
        setLoading(false);
        return;
      }

      // Crear sesión
      const sessionData = {
        id: snap.docs[0].id,
        ...userData,
        collection: isStaff ? "users" : "clients",
      };
      delete sessionData.password;

      sessionStorage.setItem("shopUser", JSON.stringify(sessionData));

      toast.success(`Hola de nuevo, ${sessionData.name}`);
      onClose();

      if (isStaff && sessionData.roleId) navigate("/admin");
      else navigate("/perfil");
    } catch (error) {
      console.error(error);
      toast.error("Error al ingresar.");
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA REGISTRO ---
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setLoading(true);

    try {
      // Verificar duplicados
      const q = query(
        collection(db, "clients"),
        where("email", "==", formData.email.trim()),
      );
      const existing = await getDocs(q);

      if (!existing.empty) {
        toast.warning("El correo ya está registrado.");
        setLoading(false);
        return;
      }

      const newClient = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password.trim(),
        phone: formData.phone,
        role: "client",
        walletBalance: 0,
        points: 0,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "clients"), newClient);

      const sessionData = {
        id: docRef.id,
        ...newClient,
        collection: "clients",
      };
      delete sessionData.password;

      sessionStorage.setItem("shopUser", JSON.stringify(sessionData));

      toast.success("Cuenta creada exitosamente.");
      navigate("/perfil");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Error al registrarse.");
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
      <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
        >
          <X size={20} className="text-slate-500" />
        </button>

        <h2 className="text-2xl font-black text-center text-slate-800 mb-6">
          {view === "login" ? "Ingresar" : "Crear Cuenta"}
        </h2>

        <form
          onSubmit={view === "login" ? handleLogin : handleRegister}
          className="space-y-4"
        >
          {/* Nombre (Solo registro) */}
          {view === "register" && (
            <div className="relative">
              <User
                className="absolute left-4 top-3.5 text-slate-400"
                size={18}
              />
              <input
                type="text"
                name="name"
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 transition-all placeholder:text-slate-400"
                placeholder="Nombre completo"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
          )}

          {/* Email */}
          <div className="relative">
            <Mail
              className="absolute left-4 top-3.5 text-slate-400"
              size={18}
            />
            <input
              type="email"
              name="email"
              required
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 transition-all placeholder:text-slate-400"
              placeholder="correo@ejemplo.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          {/* Celular (Solo registro) */}
          {view === "register" && (
            <div className="relative">
              <Phone
                className="absolute left-4 top-3.5 text-slate-400"
                size={18}
              />
              <input
                type="tel"
                name="phone"
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 transition-all placeholder:text-slate-400"
                placeholder="Celular (10 dígitos)"
                value={formData.phone}
                onChange={handleChange}
                maxLength={10}
              />
            </div>
          )}

          {/* Password */}
          <div className="relative">
            <Lock
              className="absolute left-4 top-3.5 text-slate-400"
              size={18}
            />
            <input
              type="password"
              name="password"
              required
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 transition-all placeholder:text-slate-400"
              placeholder="Contraseña"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : view === "login" ? (
              "Iniciar Sesión"
            ) : (
              "Registrarme"
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          <button
            onClick={() => {
              setView(view === "login" ? "register" : "login");
              setFormData({ name: "", email: "", password: "", phone: "" }); // Limpiar al cambiar
            }}
            className="text-blue-600 font-bold hover:underline"
          >
            {view === "login"
              ? "¿No tienes cuenta? Regístrate gratis"
              : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}
