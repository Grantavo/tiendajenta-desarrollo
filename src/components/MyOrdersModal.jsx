import React, { useEffect, useState } from "react";
import {
  X,
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  AlertCircle,
  Wallet, // <--- 1. NUEVA IMPORTACIÓN
} from "lucide-react";

// FIREBASE
import { db } from "../firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function MyOrdersModal({ isOpen, onClose, user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);

  // Cargar Pedidos al abrir el modal
  useEffect(() => {
    if (isOpen && user?.phone) {
      const fetchOrders = async () => {
        setLoading(true);
        try {
          // Buscamos pedidos asociados al teléfono del usuario
          // IMPORTANTE: Usamos el teléfono como identificador único
          const q = query(
            collection(db, "orders"),
            where("phone", "==", user.phone),
          );

          const querySnapshot = await getDocs(q);
          const ordersData = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Ordenamos por fecha (del más reciente al más antiguo) en JavaScript
          // para evitar errores de índices complejos en Firebase por ahora.
          ordersData.sort((a, b) => {
            // Si tienes timestamp de firebase:
            if (a.createdAt && b.createdAt) return b.createdAt - a.createdAt;
            // Si solo tienes string de fecha, intentamos por ID (que suele ser incremental o timestamp)
            return String(b.id).localeCompare(String(a.id));
          });

          setOrders(ordersData);
        } catch (error) {
          console.error("Error cargando mis pedidos:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchOrders();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  // Función auxiliar para colores de estado
  const getStatusColor = (status) => {
    switch (status) {
      case "Pendiente":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Preparación":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Terminado":
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "Entregado":
        return "bg-green-100 text-green-700 border-green-200";
      case "Anulado":
        return "bg-red-100 text-red-700 border-red-200";
      // Agregamos estilo para Eliminado para que se vea consistente
      case "Eliminado":
        return "bg-red-50 text-red-800 border-red-100";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Pendiente":
        return <Clock size={16} />;
      case "Preparación":
        return <Package size={16} />;
      case "Entregado":
        return <CheckCircle size={16} />;
      case "Terminado":
        return <Truck size={16} />;
      case "Anulado":
      case "Eliminado": // Usamos XCircle también para eliminado si no hay Trash2 importado
        return <XCircle size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Package className="text-blue-600" /> Mis Pedidos
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Historial de compras reciente
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-100 text-slate-500 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-50/50">
          {loading ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p>Buscando tus pedidos...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center opacity-60">
              <Package size={64} className="text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-600">
                Aún no tienes pedidos
              </p>
              <p className="text-sm text-slate-400">
                ¡Explora la tienda y haz tu primera compra!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow duration-200"
                >
                  {/* Resumen del Pedido (Click para expandir) */}
                  <div
                    onClick={() =>
                      setExpandedOrder(
                        expandedOrder === order.id ? null : order.id,
                      )
                    }
                    className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-50 text-blue-600 font-bold p-3 rounded-lg text-sm min-w-[60px] text-center">
                        #{String(order.id).slice(-4)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${getStatusColor(order.status)}`}
                          >
                            {getStatusIcon(order.status)} {order.status}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar size={12} /> {order.date}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-700">
                          {order.items?.length || 0} productos
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-slate-50 pt-3 sm:pt-0">
                      <p className="text-lg font-black text-slate-800">
                        ${Number(order.total).toLocaleString()}
                      </p>
                      {expandedOrder === order.id ? (
                        <ChevronUp size={20} className="text-slate-300" />
                      ) : (
                        <ChevronDown size={20} className="text-slate-300" />
                      )}
                    </div>
                  </div>

                  {/* Detalles Desplegables */}
                  {expandedOrder === order.id && (
                    <div className="bg-slate-50 border-t border-slate-100 p-4 animate-in slide-in-from-top-2">
                      {/* --- 2. MEJORA: AVISO DE REEMBOLSO --- */}
                      {(order.status === "Eliminado" ||
                        order.status === "Anulado") &&
                        order.isPaid && (
                          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-3">
                            <div className="bg-green-100 p-2 rounded-full text-green-600 mt-0.5">
                              <Wallet size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-green-700">
                                Reembolso Procesado
                              </p>
                              <p className="text-[11px] text-green-600 leading-tight mt-0.5">
                                El dinero de este pedido ha sido devuelto a tu
                                saldo de Billetera Virtual correctamente.
                              </p>
                            </div>
                          </div>
                        )}
                      {/* ----------------------------------- */}

                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
                        Detalle de productos
                      </h4>
                      <div className="space-y-2">
                        {order.items?.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-400 text-xs">
                                x{item.qty}
                              </span>
                              <span className="text-slate-700 font-medium truncate max-w-[180px] sm:max-w-xs">
                                {item.title}
                              </span>
                            </div>
                            <span className="font-medium text-slate-600">
                              ${(item.price * item.qty).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-xs text-slate-400">
                          Método de pago:
                        </span>
                        <span className="text-xs font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">
                          {order.paymentMethod || "Efectivo / Otro"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
          <button
            onClick={onClose}
            className="text-sm font-bold text-slate-500 hover:text-slate-800 transition"
          >
            Cerrar
          </button>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
