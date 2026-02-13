import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Hook para detectar inactividad del usuario.
 * @param {number} timeout - Tiempo en milisegundos para considerar inactivo.
 * @param {function} onIdle - Función a ejecutar cuando se detecta inactividad.
 */
export default function useIdleTimer({ timeout = 1000 * 60 * 15, onIdle }) {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef(null);
  const onIdleRef = useRef(onIdle);

  // Mantener la referencia de onIdle actualizada
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  const resetTimer = useCallback(() => {
    setIsIdle(false);
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      setIsIdle(true);
      if (onIdleRef.current) onIdleRef.current();
    }, timeout);
  }, [timeout]);

  useEffect(() => {
    // Eventos que resetearán el temporizador
    const events = [
      "mousemove",
      "keydown",
      "wheel",
      "DOMMouseScroll",
      "mousewheel",
      "mousedown",
      "touchstart",
      "touchmove",
      "MSPointerMove",
    ];

    // Función optimizada con throttle para no saturar en mousemove
    let lastReset = 0;
    const handleActivity = () => {
      const now = Date.now();
      // Solo resetear si han pasado más de 1 segundo desde el último reset
      // para evitar llamar a clearTimeout/setTimeout mil veces por segundo al mover el mouse
      if (now - lastReset > 1000) {
        resetTimer();
        lastReset = now;
      }
    };

    // Agregar listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Iniciar el timer al montar
    resetTimer();

    // Limpieza
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer]);

  return isIdle;
}
