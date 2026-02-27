import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle, ShoppingBag, Home, Loader2, XCircle } from "lucide-react";
import { db } from "../../firebase/config";
import { doc, updateDoc } from "firebase/firestore";

export default function ThankYou() {
  const location = useLocation();
  const navigate = useNavigate();

  // Leer parámetros de la URL (vienen de Bold en el redirect)
  const params = new URLSearchParams(location.search);
  const boldStatus = params.get("bold-order-status");       // "approved" | "declined" | etc.
  const boldJentaOrderId = params.get("bold-order-id-jenta"); // nuestro ID interno
  const boldTxId = params.get("bold-tx-id");                // ID de transacción Bold

  // Datos de checkout normal (vienen via navigate state)
  const state = location.state || {};
  const { orderId, total, items, paymentMethod } = state;

  const [isRedirecting, setIsRedirecting] = useState(false);
  const [boldProcessing, setBoldProcessing] = useState(!!boldStatus);
  const [boldError, setBoldError] = useState(false);

  // Manejar resultado del pago Bold
  useEffect(() => {
    if (!boldStatus || !boldJentaOrderId) return;

    const handleBoldResult = async () => {
      try {
        const orderRef = doc(db, "orders", boldJentaOrderId);
        if (boldStatus === "approved") {
          await updateDoc(orderRef, {
            status: "Procesando",
            boldTxId: boldTxId || "",
            boldStatus: "approved",
            paidAt: new Date(),
          });
          setBoldProcessing(false);
        } else {
          await updateDoc(orderRef, {
            status: "Cancelado",
            boldStatus: boldStatus,
          });
          setBoldError(true);
          setBoldProcessing(false);
        }
      } catch (err) {
        console.error("Error actualizando orden Bold:", err);
        setBoldProcessing(false);
      }
    };

    handleBoldResult();
  }, [boldStatus, boldJentaOrderId, boldTxId]);

  // Redirect si no hay datos ni params Bold
  useEffect(() => {
    if (!orderId && !boldStatus) {
      const timer = setTimeout(() => {
        setIsRedirecting(true);
        navigate("/");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [orderId, boldStatus, navigate]);

  if (!orderId && !boldStatus && isRedirecting) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <Loader2 className="animate-spin text-green-600" size={40} />
        <p className="text-slate-500">Redirigiendo a la tienda...</p>
      </div>
    );
  }

  // Spinner mientras se confirma el pago Bold
  if (boldProcessing) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-slate-600 font-semibold">Confirmando tu pago...</p>
        <p className="text-slate-400 text-sm">Un momento por favor.</p>
      </div>
    );
  }

  // Pago Bold rechazado
  if (boldError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-3xl shadow-xl overflow-hidden animate-in zoom-in duration-300">
          <div className="bg-red-500 p-8 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <XCircle size={40} className="text-red-500" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">Pago no completado</h1>
            <p className="text-red-100 font-medium">El pago con Bold fue rechazado o cancelado.</p>
          </div>
          <div className="p-8 space-y-3">
            <p className="text-sm text-slate-500 text-center mb-4">
              Tu pedido quedó cancelado. Puedes intentar de nuevo con otro método de pago.
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold hover:bg-slate-900 transition flex items-center justify-center gap-2"
            >
              <Home size={18} /> Volver a la Tienda
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Éxito (pago normal o Bold aprobado)
  const displayOrderId = boldJentaOrderId || orderId;
  const needsVerification = paymentMethod === "WhatsApp" || paymentMethod === "Transferencia";
  const isBoldSuccess = boldStatus === "approved";

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
            {isBoldSuccess ? "¡Pago confirmado con Bold! 🎉" : "Tu pedido ha sido recibido."}
          </p>
        </div>

        <div className="p-8">
          {displayOrderId ? (
            <div className="text-center mb-8">
              <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">
                Número de Pedido
              </p>
              <p className="text-4xl font-black text-slate-800 tracking-tighter">
                #{displayOrderId}
              </p>
              {boldTxId && (
                <p className="text-xs text-slate-400 mt-2">TX Bold: {boldTxId}</p>
              )}
            </div>
          ) : (
            <div className="text-center mb-8 bg-yellow-50 p-4 rounded-xl border border-yellow-100">
              <p className="text-slate-600 text-sm">Tu pedido se procesó correctamente. Revisa tu historial.</p>
            </div>
          )}

          {needsVerification && (
            <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3 items-start">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600 shrink-0">
                <Loader2 size={18} className="animate-spin" />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-800">Verificación Pendiente</p>
                <p className="text-xs text-blue-600 mt-1 leading-relaxed">
                  Tu pedido se procesará una vez hayamos verificado tu transferencia.
                </p>
              </div>
            </div>
          )}

          {items && items.length > 0 && (
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-8">
              <h3 className="text-sm font-bold text-slate-500 mb-4 border-b border-slate-200 pb-2">
                Resumen de compra
              </h3>
              <div className="space-y-3 mb-4 max-h-40 overflow-y-auto custom-scrollbar">
                {items.map((item, idx) => {
                  const qty = Number(item.quantity || item.qty || 1);
                  const price = Number(item.price) || 0;
                  return (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-slate-600 truncate w-3/4">{qty}x {item.title}</span>
                      <span className="font-bold text-slate-800">${(price * qty).toLocaleString("es-CO")}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <span className="font-bold text-slate-800">Total</span>
                <span className="text-xl font-black text-green-600">
                  ${Number(total || 0).toLocaleString("es-CO")}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => navigate("/perfil", { state: { openOrders: true } })}
              className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold hover:bg-slate-900 transition flex items-center justify-center gap-2 shadow-lg shadow-slate-800/20"
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
        Gracias por confiar en nosotros. Tu satisfacción es nuestra prioridad.
      </p>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}
