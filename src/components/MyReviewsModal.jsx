import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Star, MessageSquare, CheckCircle, ExternalLink, Loader2 } from "lucide-react";

// FIREBASE
import { db } from "../firebase/config";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";

// Fecha relativa
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

function Stars({ value, size = 14 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= value ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}
        />
      ))}
    </div>
  );
}

export default function MyReviewsModal({ isOpen, onClose, userId }) {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !userId) return;

    setLoading(true);
    const q = query(
      collection(db, "reviews"),
      where("clientId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleGoToProduct = (productId) => {
    onClose();
    navigate(`/producto/${productId}`);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-xl">
              <MessageSquare size={22} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Mis Reseñas</h2>
              <p className="text-xs text-slate-400">
                {reviews.length} {reviews.length === 1 ? "opinión" : "opiniones"} publicadas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-slate-300" size={32} />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <Star size={48} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">
                Aún no has dejado reseñas
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Ve a un producto que hayas comprado y deja tu opinión
              </p>
              <button
                onClick={() => { onClose(); navigate("/"); }}
                className="mt-4 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-black transition"
              >
                Explorar Productos
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-slate-50 border border-slate-100 rounded-2xl p-4 hover:shadow-sm transition"
                >
                  {/* PRODUCTO */}
                  <button
                    onClick={() => handleGoToProduct(review.productId)}
                    className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition mb-2 group"
                  >
                    <span className="truncate">{review.productName || "Producto"}</span>
                    <ExternalLink size={13} className="opacity-0 group-hover:opacity-100 transition flex-shrink-0" />
                  </button>

                  {/* ESTRELLAS + FECHA */}
                  <div className="flex items-center gap-3 mb-2">
                    <Stars value={review.rating} />
                    <span className="text-[11px] text-slate-400">
                      {timeAgo(review.createdAt)}
                    </span>
                    {review.verified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle size={9} /> Verificada
                      </span>
                    )}
                  </div>

                  {/* COMENTARIO */}
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {review.comment}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
