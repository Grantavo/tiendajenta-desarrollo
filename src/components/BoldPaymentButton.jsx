import { useEffect, useRef, useState } from "react";
import { sha256 } from "../utils/crypto";

/**
 * BoldPaymentButton
 * Carga el SDK de Bold e inyecta el botón de pago en el DOM.
 *
 * @param {string} orderId   - ID único del pedido (ej: "JENTA-1740001234")
 * @param {number} amount    - Monto en pesos COP (ej: 50000)
 * @param {string} apiKey    - API Key pública de Bold
 * @param {string} secretKey - Secret Key privada de Bold (para firma)
 * @param {string} redirectUrl - URL a la que Bold redirige tras el pago
 */
export default function BoldPaymentButton({
  orderId,
  amount,
  apiKey,
  secretKey,
  redirectUrl,
}) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId || !amount || !apiKey || !secretKey) {
      setError("Faltan datos para iniciar el pago con Bold.");
      setLoading(false);
      return;
    }

    let isMounted = true;

    const injectBoldScript = async () => {
      try {
        // Firma de integridad: SHA-256(orderId + currency + amount + secretKey)
        const rawString = `${orderId}COP${amount}${secretKey}`;
        const signature = await sha256(rawString);

        if (!isMounted || !containerRef.current) return;

        // Limpiar cualquier script previo
        const old = document.getElementById("bold-payment-script");
        if (old) old.remove();

        // Crear el script de Bold con todos los atributos requeridos
        const script = document.createElement("script");
        script.id = "bold-payment-script";
        script.src =
          "https://checkout.bold.co/library/boldPaymentButton.js";
        script.setAttribute("data-bold-button", "");
        script.setAttribute("data-order-id", orderId);
        script.setAttribute("data-currency", "COP");
        script.setAttribute("data-amount", String(amount));
        script.setAttribute("data-api-key", apiKey);
        script.setAttribute("data-integrity-signature", signature);
        script.setAttribute("data-redirection-url", redirectUrl);

        script.onload = () => {
          if (isMounted) setLoading(false);
        };
        script.onerror = () => {
          if (isMounted) {
            setError("No se pudo conectar con Bold. Verifica tu conexión.");
            setLoading(false);
          }
        };

        containerRef.current.appendChild(script);
      } catch (err) {
        console.error("Error preparando pago Bold:", err);
        if (isMounted) {
          setError("Error preparando el pago. Intenta de nuevo.");
          setLoading(false);
        }
      }
    };

    injectBoldScript();

    return () => {
      isMounted = false;
      const old = document.getElementById("bold-payment-script");
      if (old) old.remove();
    };
  }, [orderId, amount, apiKey, secretKey, redirectUrl]);

  return (
    <div className="mt-4">
      {loading && !error && (
        <div className="flex items-center justify-center gap-3 py-4 text-slate-500 text-sm">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
          Conectando con Bold...
        </div>
      )}
      {error && (
        <p className="text-sm text-red-500 text-center py-3 bg-red-50 rounded-xl">
          ⚠️ {error}
        </p>
      )}
      {/* El script de Bold renderiza el botón aquí */}
      <div ref={containerRef} className={loading ? "hidden" : "flex justify-center"} />
    </div>
  );
}
