import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle, ShoppingBag, Home, Loader2 } from "lucide-react";

export default function ThankYou() {
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Intentamos leer los datos. Si no existen, usamos valores por defecto para no romper la página.
  const state = location.state || {};
  const { orderId, total, items } = state;

  // Estado para controlar la redirección segura
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Si entran a esta página sin datos (ej: recargando el navegador),
    // esperamos 3 segundos y los mandamos al home, pero MOSTRANDO algo visual.
    if (!orderId) {
      const timer = setTimeout(() => {
        setIsRedirecting(true);
        navigate("/");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [orderId, navigate]);

  // Si se está redirigiendo por falta de datos, mostramos un spinner
  if (!orderId && isRedirecting) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <Loader2 className="animate-spin text-green-600" size={40} />
        <p className="text-slate-500">Redirigiendo a la tienda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-3xl shadow-xl overflow-hidden animate-in zoom-in duration-300">
        {/* Header Verde */}
        <div className="bg-green-600 p-8 text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">¡Gracias!</h1>
          <p className="text-green-100 font-medium">
            Tu pedido ha sido recibido.
          </p>
        </div>

        {/* Detalles del Pedido */}
        <div className="p-8">
          {/* Si hay ID, lo mostramos. Si no, mostramos mensaje genérico */}
          {orderId ? (
            <div className="text-center mb-8">
              <p className="text-sm text-slate-400 uppercase tracking-wider font-bold mb-1">
                Número de Pedido
              </p>
              <p className="text-3xl font-black text-slate-800 tracking-tight">
                #{orderId}
              </p>
            </div>
          ) : (
            <div className="text-center mb-8 bg-yellow-50 p-4 rounded-xl border border-yellow-100">
              <p className="text-slate-600 text-sm">
                Tu pedido se procesó correctamente, pero no pudimos cargar el
                resumen aquí.
                <br />
                Revisa tu historial.
              </p>
            </div>
          )}

          {/* Resumen de Items (Solo si existen) */}
          {items && items.length > 0 && (
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-8">
              <h3 className="text-sm font-bold text-slate-500 mb-4 border-b border-slate-200 pb-2">
                Resumen de compra
              </h3>
              <div className="space-y-3 mb-4 max-h-40 overflow-y-auto custom-scrollbar">
                {items.map((item, idx) => {
                  // [FIX] Asegurar números limpios antes de operar
                  const qty = Number(item.quantity || item.qty || 1);
                  const price = Number(item.price) || 0;
                  const itemTotal = price * qty;

                  return (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-slate-600 truncate w-3/4">
                        {qty}x {item.title}
                      </span>
                      <span className="font-bold text-slate-800">
                        ${itemTotal.toLocaleString("es-CO")}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <span className="font-bold text-slate-800">Total Pagado</span>
                <span className="text-xl font-black text-green-600">
                  ${Number(total || 0).toLocaleString("es-CO")}
                </span>
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="space-y-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full bg-slate-800 text-white py-3.5 rounded-xl font-bold hover:bg-slate-900 transition flex items-center justify-center gap-2 shadow-lg shadow-slate-800/20"
            >
              <ShoppingBag size={18} /> Ver mis Pedidos
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full bg-white text-slate-600 border border-slate-200 py-3.5 rounded-xl font-bold hover:bg-slate-50 transition flex items-center justify-center gap-2"
            >
              <Home size={18} /> Volver a la Tienda
            </button>
          </div>
        </div>
      </div>

      <p className="mt-8 text-slate-400 text-sm text-center max-w-xs">
        Hemos procesado tu pago de forma segura.
      </p>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}
