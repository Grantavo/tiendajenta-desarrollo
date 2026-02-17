import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Mail, Lock, User, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";

// FIREBASE
import { auth, db } from "../firebase/config";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile 
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
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

  // --- 1. VALIDACIONES ESTRICTAS ---
  const validateInputs = () => {
    // Email: Regex estándar
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

    // Validaciones exclusivas de Registro
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

  // --- 2. CONTROL DE INPUTS (MÁSCARAS) ---
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Si es Celular: Solo permitir números
    if (name === "phone") {
      const onlyNums = value.replace(/\D/g, ""); // Borra letras
      if (onlyNums.length <= 10) {
        setFormData({ ...formData, phone: onlyNums });
      }
      return;
    }

    // Si es Nombre: Solo permitir letras
    if (name === "name") {
      const onlyLetters = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
      setFormData({ ...formData, name: onlyLetters });
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  // --- LÓGICA LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setLoading(true);

    try {
      // 1. Iniciar sesión con Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        formData.email.trim(), 
        formData.password.trim()
      );
      const user = userCredential.user;

      // 2. Buscar datos adicionales en Firestore (primero en clients, luego en users)
      // Nota: Idealmente deberíamos saber dónde buscar, pero mantenemos la lógica de intentos
      // O unificamos usuarios. Por ahora buscamos en 'clients' primero.
      let userData = null;
      let collectionName = "users"; // Asumimos users primero para dar prioridad a admins
      
      // 1. Intentar en USERS (Prioridad Admin)
      let docRef = doc(db, "users", user.uid);
      let docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // 2. Si no es admin, buscar en CLIENTS
        docRef = doc(db, "clients", user.uid);
        docSnap = await getDoc(docRef);
        collectionName = "clients";
      }

      if (docSnap.exists()) {
        userData = { id: user.uid, ...docSnap.data(), collection: collectionName };
        
        // Si es Staff, recuperar ROLES para permisos granulares
        // (Esto lo mantenemos en localStorage por compatibilidad con ProtectedRoute existente, 
        //  pero idealmente deberíamos moverlo a un contexto)
        if (collectionName === "users") {
           // Asignamos una marca temporal de admin
           try {
             // Aquí buscaríamos los roles globales si fuera necesario, 
             // por ahora simulamos lo que hacía el código anterior
             // pero OJO: el código anterior traía TODOS los roles.
             // Para simplificar, obtenemos los roles de nuevo si es necesario
             // o confiamos en el ID del rol en el usuario.
             // (Dejamos la parte de roles pendiente de refactorizar en ProtectedRoute, 
             //  pero guardamos lo básico en sessionStorage para compatibilidad)
           } catch (err) {
             console.error("Error cargando roles", err);
           }
        }
      } else {
        // Si no existe en Firestore pero sí en Auth (caso raro, migracion incompleta o error)
        // Creamos un perfil básico de cliente? No, mejor error.
        toast.error("Error de integridad: Usuario sin perfil de datos.");
        setLoading(false);
        return;
      }

      // 3. Guardar en SessionStorage por compatibilidad (TEMPORAL MIENTRAS SE MIGRA ADMIN)
      sessionStorage.setItem("shopUser", JSON.stringify(userData));

      toast.success(`Bienvenido de nuevo, ${userData.name || user.displayName}`);

      // 4. Notificar a toda la app
      window.dispatchEvent(new Event("auth-change"));

      onClose();

      // Redirigir
      if (collectionName === "users") {
        navigate("/admin");
      } else {
        navigate("/");
      }

    } catch (error) {
      console.error("🔴 [LOGIN] Error:", error.code, error.message);
      if (error.code === 'auth/invalid-credential') {
        toast.error("Correo o contraseña incorrectos.");
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error("Dominio no autorizado. Contacta al administrador.", {
          description: "Este sitio no está habilitado para autenticación.",
          duration: 6000,
        });
      } else if (error.code === 'auth/network-request-failed') {
        toast.error("Error de red. Verifica tu conexión a internet.");
      } else if (error.code === 'auth/too-many-requests') {
        toast.error("Demasiados intentos. Espera unos minutos e intenta de nuevo.");
      } else {
        toast.error(`Error al ingresar (${error.code || "desconocido"})`, {
          description: error.message,
          duration: 8000,
        });
      }
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
      // 1. Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email.trim(), 
        formData.password.trim()
      );
      const user = userCredential.user;

      // 2. Actualizar perfil básico (displayName)
      await updateProfile(user, {
        displayName: formData.name.trim()
      });

      // 3. Crear documento en Firestore (Clients)
      // Usamos el UID de Authentication como ID del documento
      const newClient = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone,
        role: "client",
        balance: 0,
        points: 0,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "clients", user.uid), newClient);

      // 4. Sesión (Compatibilidad)
      const sessionData = {
        id: user.uid,
        ...newClient,
        collection: "clients",
        createdAt: new Date().toISOString(),
      };

      sessionStorage.setItem("shopUser", JSON.stringify(sessionData));

      // 5. Notificar app
      window.dispatchEvent(new Event("auth-change"));

      toast.success("Cuenta creada exitosamente.");

      onClose();
      navigate("/perfil", { state: { openProfile: true, isNewUser: true } });

    } catch (error) {
      console.error("🔴 [REGISTRO] Error:", error.code, error.message);
      if (error.code === 'auth/email-already-in-use') {
        toast.warning("El correo ya está registrado.");
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error("Dominio no autorizado. Contacta al administrador.", {
          description: "Este sitio no está habilitado para autenticación.",
          duration: 6000,
        });
      } else if (error.code === 'auth/weak-password') {
        toast.error("La contraseña es muy débil. Usa al menos 6 caracteres.");
      } else if (error.code === 'auth/invalid-email') {
        toast.error("El correo electrónico no es válido.");
      } else if (error.code === 'auth/network-request-failed') {
        toast.error("Error de red. Verifica tu conexión a internet.");
      } else {
        toast.error(`Error al registrarse (${error.code || "desconocido"})`, {
          description: error.message,
          duration: 8000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA GOOGLE SIGN-IN (popup en todos los dispositivos) ---
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      // Verificar si ya existe en users (admin) o clients
      let userData = null;
      let collectionName = "users";
      let isNew = false;

      let docRef = doc(db, "users", googleUser.uid);
      let docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        docRef = doc(db, "clients", googleUser.uid);
        docSnap = await getDoc(docRef);
        collectionName = "clients";
      }

      if (docSnap.exists()) {
        userData = { id: googleUser.uid, ...docSnap.data(), collection: collectionName };
      } else {
        isNew = true;
        const newClient = {
          name: googleUser.displayName || "Cliente Google",
          email: googleUser.email,
          phone: "",
          role: "client",
          balance: 0,
          points: 0,
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, "clients", googleUser.uid), newClient);
        collectionName = "clients";
        userData = {
          id: googleUser.uid,
          ...newClient,
          collection: "clients",
          createdAt: new Date().toISOString(),
        };
      }

      sessionStorage.setItem("shopUser", JSON.stringify(userData));
      window.dispatchEvent(new Event("auth-change"));
      toast.success(`¡Bienvenido, ${userData.name || googleUser.displayName}!`);
      onClose();

      if (collectionName === "users") {
        navigate("/admin");
      } else if (isNew) {
        navigate("/perfil", { state: { openProfile: true, isNewUser: true } });
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("🔴 [GOOGLE] Error:", error.code, error.message);
      if (error.code === "auth/popup-closed-by-user") {
        // El usuario cerró el popup, no mostrar error
      } else if (error.code === "auth/popup-blocked") {
        toast.error("El navegador bloqueó la ventana de Google. Permite popups e intenta de nuevo.", {
          duration: 6000,
        });
      } else if (error.code === "auth/unauthorized-domain") {
        toast.error("Dominio no autorizado para Google Sign-In.", {
          description: "Contacta al administrador.",
        });
      } else {
        toast.error(`Error con Google (${error.code || "desconocido"})`, {
          description: error.message,
          duration: 8000,
        });
      }
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

        {/* SEPARADOR */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="text-xs text-slate-400 font-medium">o continúa con</span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        {/* BOTÓN GOOGLE */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
          </svg>
          Continuar con Google
        </button>

        <div className="mt-6 text-center text-sm text-slate-500">
          <button
            onClick={() => {
              setView(view === "login" ? "register" : "login");
              setFormData({ name: "", email: "", password: "", phone: "" });
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
