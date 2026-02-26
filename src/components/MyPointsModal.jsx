import React, { useState, useEffect } from "react";
import { X, Trophy, Star, ShoppingBag, Loader2 } from "lucide-react";

import { db } from "../firebase/config";
import {
  collection,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";

function timeAgo(timestamp) {
  if (!timestamp) return "";
  const seconds =
    typeof timestamp.seconds === "number"
      ? timestamp.seconds
      : Math.floor(new Date(timestamp).getTime() / 1000);
  const diff = Math.floor(Date.now() / 1000) - seconds;

  if (diff < 60) return "Hace un momento";
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} horas`;
  if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} días`;
  if (diff < 2592000) return `Hace ${Math.floor(diff / 604800)} semanas`;
  return `Hace ${Math.floor(diff / 2592000)} meses`;
}

export default function MyPointsModal({ isOpen, onClose, userId, currentPoints = 0 }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "clients", userId, "pointsHistory"),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error cargando historial de puntos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const typeConfig = {
    earn: { icon: ShoppingBag, color: "text-green-600", bg: "bg-green-50", label: "Compra" },
    review: { icon: Star, color: "text-amber-600", bg: "bg-amber-50", label: "Reseña" },
    redeem: { icon: Trophy, color: "text-red-600", bg: "bg-red-50", label: "Canje" },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/20 transition"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Trophy size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black">Mis Puntos</h2>
              <p className="text-white/80 text-sm">Programa de fidelización</p>
            </div>
          </div>
          <div className="bg-white/20 rounded-xl p-4 mt-2">
            <p className="text-white/80 text-xs font-bold uppercase tracking-wider">Saldo actual</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black">{currentPoints.toLocaleString()}</span>
              <span className="text-white/80 font-bold mb-1">puntos</span>
            </div>
          </div>
        </div>

        {/* HISTORIAL */}
        <div className="max-h-[50vh] overflow-y-auto p-5 custom-scrollbar">
          <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider mb-4">
            Historial de movimientos
          </h3>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-slate-300" size={28} />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-10">
              <Trophy size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">
                Aún no tienes movimientos
              </p>
              <p className="text-xs text-slate-300 mt-1">
                Gana puntos comprando y dejando reseñas
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => {
                const config = typeConfig[entry.type] || typeConfig.earn;
                const Icon = config.icon;
                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:shadow-sm transition"
                  >
                    <div className={`p-2 rounded-lg ${config.bg}`}>
                      <Icon size={18} className={config.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 truncate">
                        {entry.description || "Puntos ganados"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {timeAgo(entry.createdAt)}
                      </p>
                    </div>
                    <span className={`font-black text-sm ${entry.type === "redeem" ? "text-red-600" : "text-green-600"}`}>
                      {entry.type === "redeem" ? "-" : "+"}
                      {entry.points}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-400 text-center">
            1 punto por cada $1,000 en compras • 5 puntos por reseña verificada
          </p>
        </div>
      </div>

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }`}</style>
    </div>
  );
}
