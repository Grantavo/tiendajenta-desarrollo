import { useEffect, useRef, useState } from "react";
import { sha256 } from "../utils/crypto";

/**
 * BoldPaymentButton
 * Carga el SDK de Bold e inyecta el botón de pago.
 * Dispara el clic automáticamente para que la pasarela se abra sin que el cliente lo haga.
 */
export default function BoldPaymentButton({
  orderId,
  amount,
  apiKey,
  secretKey,
  redirectUrl,
  customerData,
}) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error

  useEffect(() => {
    if (!orderId || !amount || !apiKey || !secretKey) {
      setStatus("error");
      return;
    }

    let isMounted = true;
    let observer = null;

    const injectBoldScript = async () => {
      try {
        const rawString = `${orderId}${amount}COP${secretKey}`;
        const signature = await sha256(rawString);

        if (!isMounted || !containerRef.current) return;

        // Limpiar script previo
        const old = document.getElementById("bold-payment-script");
        if (old) old.remove();

        const script = document.createElement("script");
        script.id = "bold-payment-script";
        script.src = "https://checkout.bold.co/library/boldPaymentButton.js";
        script.setAttribute("data-bold-button", "dark-L");
        script.setAttribute("data-order-id", orderId);
        script.setAttribute("data-currency", "COP");
        script.setAttribute("data-amount", String(amount));
        script.setAttribute("data-api-key", apiKey);
        script.setAttribute("data-integrity-signature", signature);
        script.setAttribute("data-redirection-url", redirectUrl);
        script.setAttribute("data-render-mode", "embedded");
        if (customerData) {
          script.setAttribute("data-customer-data", customerData);
        }

        // Cuando el script cargue, observar para clickear el botón automáticamente
        script.onload = () => {
          if (!isMounted) return;
          setStatus("ready");

          // Esperar a que Bold inyecte el botón en el DOM y disparar el clic
          let attempts = 0;
          const tryClick = setInterval(() => {
            attempts++;
            const boldEl = containerRef.current?.querySelector("button, [class*='bold'], [id*='bold']");
            if (boldEl) {
              console.log("[Bold] Botón detectado, abriendo pasarela automáticamente...");
              boldEl.click();
              clearInterval(tryClick);
            }
            if (attempts > 30) clearInterval(tryClick); // Dejar de intentar después de 3 seg
          }, 100);
        };

        script.onerror = () => {
          if (isMounted) setStatus("error");
        };

        // El contenedor DEBE estar en el DOM y visible para que Bold renderice
        containerRef.current.appendChild(script);
      } catch (err) {
        console.error("Error Bold:", err);
        if (isMounted) setStatus("error");
      }
    };

    injectBoldScript();

    return () => {
      isMounted = false;
      if (observer) observer.disconnect();
      const old = document.getElementById("bold-payment-script");
      if (old) old.remove();
    };
  }, [orderId, amount, apiKey, secretKey, redirectUrl]);

  return (
    <div>
      {status === "loading" && (
        <div className="flex items-center justify-center gap-3 py-3 text-slate-500 text-sm">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
          Abriendo pasarela de pago...
        </div>
      )}
      {status === "error" && (
        <p className="text-sm text-red-500 text-center py-3 bg-red-50 rounded-xl">
          ⚠️ No se pudo conectar con Bold. Recarga la página.
        </p>
      )}
      {/* Contenedor donde Bold inyecta su botón.
          Está en el DOM para que el SDK funcione, pero invisible para el cliente.
          El auto-clic abre el modal de pago automáticamente. */}
      <div ref={containerRef} style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0, overflow: "hidden" }} />
    </div>
  );
}
