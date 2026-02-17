import React, { useState, useEffect, useMemo } from "react";
import { Star, Send, CheckCircle, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";

// FIREBASE
import { db } from "../firebase/config";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

// Hook para obtener el usuario
import { useCart } from "../context/CartContext";

// --- Función auxiliar de fecha relativa ---
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

// --- Componente de estrellas interactivo ---
function StarRating({ value = 0, onChange, size = 20, interactive = false }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(star)}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
          className={`transition-transform ${interactive ? "cursor-pointer hover:scale-125" : "cursor-default"}`}
        >
          <Star
            size={size}
            className={`transition-colors ${
              star <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "fill-slate-200 text-slate-200"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// --- Componente principal ---
export default function ReviewSection({ productId, productName }) {
  const { user } = useCart();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form fields
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  // Verificar si ya dejó reseña
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  // Verificar si compró el producto
  const [hasPurchased, setHasPurchased] = useState(false);

  // 1. Cargar reseñas en tiempo real
  useEffect(() => {
    if (!productId) return;

    const q = query(
      collection(db, "reviews"),
      where("productId", "==", productId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReviews(data);
      setLoading(false);
    }, (error) => {
      console.error("Error cargando reseñas:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [productId]);

  // 2. Verificar si el usuario ya dejó reseña y si compró el producto
  useEffect(() => {
    if (!user?.id || !productId) return;

    // ¿Ya dejó reseña?
    const exists = reviews.some(
      (r) => r.clientId === user.id
    );
    setAlreadyReviewed(exists);

    // ¿Compró el producto? (buscar en orders entregados)
    const checkPurchase = async () => {
      try {
        const ordersQ = query(
          collection(db, "orders"),
          where("clientId", "==", user.id),
          where("status", "==", "Entregado")
        );
        const ordersSnap = await getDocs(ordersQ);
        const purchased = ordersSnap.docs.some((doc) => {
          const items = doc.data().items || [];
          return items.some((item) => item.id === productId);
        });
        setHasPurchased(purchased);
      } catch (error) {
        console.error("Error verificando compra:", error);
      }
    };

    checkPurchase();
  }, [user?.id, productId, reviews]);

  // 3. Estadísticas
  const stats = useMemo(() => {
    if (reviews.length === 0) return { avg: 0, dist: [0, 0, 0, 0, 0], total: 0 };

    const total = reviews.length;
    const sum = reviews.reduce((a, r) => a + (r.rating || 0), 0);
    const avg = sum / total;

    const dist = [0, 0, 0, 0, 0]; // [5★, 4★, 3★, 2★, 1★]
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        dist[5 - r.rating]++;
      }
    });

    return { avg, dist, total };
  }, [reviews]);

  // 4. Enviar reseña
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return toast.error("Selecciona una calificación");
    if (!comment.trim()) return toast.error("Escribe un comentario");
    if (comment.trim().length < 10) return toast.error("El comentario debe tener al menos 10 caracteres");

    setSubmitting(true);
    try {
      await addDoc(collection(db, "reviews"), {
        productId,
        productName: productName || "Producto",
        clientId: user.id,
        clientName: user.name || "Cliente",
        rating,
        comment: comment.trim(),
        verified: hasPurchased,
        createdAt: serverTimestamp(),
      });

      toast.success("¡Reseña publicada! Gracias por tu opinión.");
      setRating(0);
      setComment("");
      setShowForm(false);
    } catch (error) {
      console.error("Error publicando reseña:", error);
      toast.error("Error al publicar la reseña");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-12 mb-8">
      {/* ENCABEZADO */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 rounded-xl">
            <MessageSquare size={24} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800">
              Opiniones de clientes
            </h2>
            <p className="text-sm text-slate-400">
              {stats.total === 0
                ? "Sé el primero en opinar"
                : `${stats.total} ${stats.total === 1 ? "opinión" : "opiniones"}`}
            </p>
          </div>
        </div>

        {/* BOTÓN ESCRIBIR RESEÑA */}
        {user && !alreadyReviewed && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-black transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Star size={16} />
            Escribir Reseña
          </button>
        )}
      </div>

      {/* RESUMEN DE CALIFICACIONES */}
      {stats.total > 0 && (
        <div className="bg-gradient-to-br from-slate-50 to-amber-50/30 border border-slate-100 rounded-2xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            {/* PROMEDIO */}
            <div className="text-center">
              <div className="text-5xl font-black text-slate-800">
                {stats.avg.toFixed(1)}
              </div>
              <StarRating value={Math.round(stats.avg)} size={22} />
              <p className="text-sm text-slate-400 mt-1">
                {stats.total} {stats.total === 1 ? "opinión" : "opiniones"}
              </p>
            </div>

            {/* BARRAS DE DISTRIBUCIÓN */}
            <div className="flex-1 w-full space-y-2">
              {[5, 4, 3, 2, 1].map((star, idx) => {
                const count = stats.dist[idx];
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-600 w-6 text-right">
                      {star}
                    </span>
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* FORMULARIO DE RESEÑA */}
      {showForm && user && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border-2 border-slate-200 rounded-2xl p-6 mb-8 shadow-sm animate-in slide-in-from-top-2 duration-300"
        >
          <h3 className="text-lg font-black text-slate-800 mb-4">
            ¿Qué te pareció este producto?
          </h3>

          {/* ESTRELLAS INTERACTIVAS */}
          <div className="mb-4">
            <p className="text-sm font-bold text-slate-600 mb-2">Tu calificación:</p>
            <StarRating
              value={rating}
              onChange={setRating}
              size={32}
              interactive
            />
            {rating > 0 && (
              <p className="text-xs text-amber-600 font-bold mt-1">
                {["", "Malo", "Regular", "Bueno", "Muy bueno", "Excelente"][rating]}
              </p>
            )}
          </div>

          {/* COMENTARIO */}
          <div className="mb-4">
            <p className="text-sm font-bold text-slate-600 mb-2">Tu comentario:</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 300))}
              placeholder="Cuéntanos tu experiencia con este producto..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 transition resize-none text-sm placeholder:text-slate-400"
            />
            <p className="text-xs text-slate-400 text-right">
              {comment.length}/300
            </p>
          </div>

          {/* BADGE COMPRA VERIFICADA */}
          {hasPurchased && (
            <div className="flex items-center gap-2 text-xs text-green-600 font-bold bg-green-50 px-3 py-2 rounded-lg mb-4 w-fit">
              <CheckCircle size={14} />
              Tu reseña tendrá el badge de "Compra Verificada"
            </div>
          )}

          {/* BOTÓN ENVIAR */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-amber-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {submitting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <Send size={18} /> Publicar Reseña
              </>
            )}
          </button>
        </form>
      )}

      {/* AVISO SI YA DEJÓ RESEÑA */}
      {user && alreadyReviewed && (
        <div className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-3 rounded-xl text-sm font-medium mb-6 flex items-center gap-2">
          <CheckCircle size={16} />
          Ya dejaste tu opinión sobre este producto. ¡Gracias!
        </div>
      )}

      {/* LISTA DE RESEÑAS */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-slate-300" size={32} />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <MessageSquare size={48} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">
            Aún no hay reseñas para este producto
          </p>
          <p className="text-xs text-slate-300 mt-1">
            ¡Sé el primero en dejar tu opinión!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* AVATAR */}
                <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {(review.clientName || "C")
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  {/* HEADER */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800 text-sm">
                      {review.clientName || "Cliente"}
                    </span>
                    {review.verified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                        <CheckCircle size={10} /> Compra verificada
                      </span>
                    )}
                    <span className="text-xs text-slate-300">
                      {timeAgo(review.createdAt)}
                    </span>
                  </div>

                  {/* ESTRELLAS */}
                  <div className="mt-1 mb-2">
                    <StarRating value={review.rating} size={16} />
                  </div>

                  {/* COMENTARIO */}
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {review.comment}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NOTA PARA NO LOGUEADOS */}
      {!user && reviews.length > 0 && (
        <p className="text-center text-xs text-slate-400 mt-6">
          Inicia sesión para dejar tu opinión
        </p>
      )}
    </div>
  );
}
