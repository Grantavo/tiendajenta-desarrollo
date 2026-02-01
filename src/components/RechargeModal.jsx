import React, { useState, useMemo } from "react"; // 1. CAMBIAMOS useEffect POR useMemo
import { X, Copy, Check, MessageCircle, CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function RechargeModal({ isOpen, onClose, user }) {
  const [amount, setAmount] = useState("");
  // Eliminamos el estado 'paymentMethods' porque ahora será un valor memorizado
  const [copiedId, setCopiedId] = useState(null);

  // 2. CORRECCIÓN: USAMOS useMemo PARA LEER DATOS SIN CAUSAR RE-RENDERS
  // Esto se ejecuta automáticamente cuando 'isOpen' cambia.
  const paymentMethods = useMemo(() => {
    // Si el modal está cerrado, no gastamos recursos leyendo localStorage
    if (!isOpen) return [];

    try {
      const savedPayments = JSON.parse(
        localStorage.getItem("shopPayments") || "[]",
      );
      // Filtramos y retornamos directamente
      return savedPayments.filter((p) => p.status === "active");
    } catch (e) {
      console.error("Error leyendo pagos", e);
      return [];
    }
  }, [isOpen]); // Solo se recalcula si se abre/cierra el modal

  if (!isOpen) return null;

  // 3. FUNCIÓN PARA COPIAR NÚMERO DE CUENTA (INTACTA)
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Número de cuenta copiado");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 4. FUNCIÓN PARA IR A WHATSAPP (INTACTA)
  const handleNotify = () => {
    if (!amount || amount < 1000) {
      toast.error("Por favor ingresa un monto válido (Mín. $1.000)");
      return;
    }

    // Obtener número del admin
    const settings = JSON.parse(localStorage.getItem("shopSettings") || "{}");
    let adminPhone = settings.whatsapp || settings.phone || "573000000000";
    adminPhone = adminPhone.replace(/\D/g, "");
    if (!adminPhone.startsWith("57")) adminPhone = `57${adminPhone}`;

    // Mensaje pre-construido
    const message = `👋 Hola, soy *${user.name}*.
    
Quiero recargar mi Billetera Virtual.
💰 *Monto:* $${parseInt(amount).toLocaleString()} COP
📧 *Correo:* ${user.email}

Adjunto mi comprobante de pago a continuación 👇`;

    window.open(
      `https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <CreditCard className="text-green-600" /> Recargar Saldo
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Sigue los pasos para abonar a tu cuenta
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors shadow-sm"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          {/* PASO 1: CUENTAS BANCARIAS */}
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">
              1. Transfiere a estas cuentas
            </h3>

            {paymentMethods.length > 0 ? (
              <div className="space-y-3">
                {paymentMethods.map((pm) => (
                  <div
                    key={pm.id}
                    className="bg-white border border-slate-200 p-4 rounded-xl flex justify-between items-center shadow-sm hover:border-green-200 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{pm.type}</p>
                      <p className="font-mono text-slate-600 text-sm mt-0.5">
                        {pm.accountNumber}
                      </p>
                      {pm.instructions && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          {pm.instructions}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleCopy(pm.accountNumber, pm.id)}
                      className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                      title="Copiar número"
                    >
                      {copiedId === pm.id ? (
                        <Check size={18} />
                      ) : (
                        <Copy size={18} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-red-400 italic bg-red-50 p-3 rounded-lg border border-red-100">
                No hay métodos de pago configurados en la tienda. Contacta al
                soporte.
              </p>
            )}
          </div>

          {/* PASO 2: INGRESO DE MONTO */}
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">
              2. Ingresa el valor enviado
            </h3>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                $
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-4 bg-gray-50 border border-slate-200 rounded-xl outline-none focus:border-green-500 font-bold text-xl text-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 bg-white">
          <button
            onClick={handleNotify}
            className="w-full bg-[#25D366] text-white font-bold py-4 rounded-xl hover:bg-[#20ba5a] transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
          >
            <MessageCircle size={20} />
            Notificar Pago por WhatsApp
          </button>
          <p className="text-[10px] text-center text-slate-400 mt-3">
            * El saldo se reflejará una vez validemos tu comprobante
            manualmente.
          </p>
        </div>
      </div>
    </div>
  );
}
