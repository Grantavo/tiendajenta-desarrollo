import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ProtectedRoute({ module }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setLoading(false);
        setAuthorized(false);
        return;
      }

      try {
        // 1. Obtener datos del usuario de Firestore
        // Intentamos buscar en 'users' (Staff/Admin) primero pq esto es ProtectedRoute
        let userDocRef = doc(db, "users", currentUser.uid);
        let userSnap = await getDoc(userDocRef);
        let collectionName = "users";

        if (!userSnap.exists()) {
          // Si no es staff, puede ser un cliente entrando a su perfil?
          // Si el módulo requiere permisos de admin (module != null), y no es user, fuera.
          if (module) {
             console.warn("Cliente intentando acceder a módulo de admin");
             setAuthorized(false);
             setLoading(false);
             return;
          }
          
          // Si es ruta protegida genérica (ej: perfil), buscamos en clients
          userDocRef = doc(db, "clients", currentUser.uid);
          userSnap = await getDoc(userDocRef);
          collectionName = "clients";
        }

        if (!userSnap.exists()) {
          toast.error("Usuario autenticado pero sin perfíl de datos.");
          setAuthorized(false);
          setLoading(false);
          return;
        }

        const userData = { id: currentUser.uid, ...userSnap.data(), collection: collectionName };

        // 2. Verificar Permisos (Si hay módulo requerido)
        if (module) {
          if (collectionName !== "users" || !userData.roleId) {
             setAuthorized(false);
             setLoading(false);
             return;
          }

          // Buscar el ROL real en Firestore para ver permisos
          const roleDocRef = doc(db, "roles", userData.roleId);
          const roleSnap = await getDoc(roleDocRef);

          if (!roleSnap.exists()) {
             setAuthorized(false);
             setLoading(false);
             return; 
          }

          const roleData = roleSnap.data();
          
          // SuperAdmin (isSystem) o tiene el módulo en permisos
          if (roleData.isSystem || roleData.permissions?.includes(module)) {
             setAuthorized(true);
          } else {
             console.warn(`Acceso denegado al módulo: ${module}`);
             setAuthorized(false);
          }
        } else {
          // Si no pide módulo, solo login, validamos que exista y listo
          setAuthorized(true);
        }

        setUser(userData);

      } catch (error) {
        console.error("Error en ProtectedRoute:", error);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [module]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-slate-400" size={40} />
      </div>
    );
  }

  if (!authorized) {
    // Si estaba logueado pero no autorizado, mandamos al home o login
    return <Navigate to="/login" replace />;
  }

  // Pasamos el usuario al layout/páginas hijas por si lo necesitan
  return <Outlet context={{ user }} />;
}
