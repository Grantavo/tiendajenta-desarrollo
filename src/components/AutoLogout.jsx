import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getAuth, signOut } from "firebase/auth";
import { useAuth } from "../hooks/useAuth";

const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 1 hora en milisegundos (60 min * 60 seg * 1000 ms)

export default function AutoLogout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Si no hay usuario logueado, no hace falta monitorear
    if (!user) return;

    let timeoutId;

    const logoutUser = async () => {
      try {
        const auth = getAuth();
        await signOut(auth);
        
        // Mostrar notificación de seguridad
        toast.info("Sesión cerrada por inactividad", {
          description: "Por tu seguridad, hemos cerrado tu sesión debido a 1 hora de inactividad.",
          duration: 6000,
        });

        // Si el usuario estaba en el panel de admin o perfil, lo mandamos al inicio
        if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/perfil') || location.pathname.startsWith('/inversiones')) {
             navigate("/");
        }

      } catch (error) {
        console.error("Error al cerrar sesión por inactividad:", error);
      }
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(logoutUser, INACTIVITY_LIMIT_MS);
    };

    // Eventos que indican que el usuario está interactuando
    const events = [
      "mousemove",
      "keydown",
      "mousedown",
      "touchstart",
      "scroll",
      "wheel"
    ];

    // Reiniciar el contador en cada interacción
    events.forEach(event => window.addEventListener(event, resetTimer));

    // Iniciar el contador la primera vez
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user, navigate, location.pathname]);

  // Este componente es invisible, solo ejecuta lógica en segundo plano
  return null;
}
