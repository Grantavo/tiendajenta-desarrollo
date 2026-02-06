import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import WhatsAppFloat from "../components/WhatsAppFloat";

// IMPORTAR EL CONTEXTO DEL CARRITO (YA TIENE SINCRONIZACIÓN)
import { useCart } from "../context/CartContext";

// FIREBASE
import { db } from "../firebase/config";
import {
  collection,
  getDocs,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { toast } from "sonner";

// Iconos
import {
  ShoppingCart,
  X,
  Trash2,
  ArrowRight,
  CreditCard,
  Check,
  Plus,
  Minus,
  Wallet,
} from "lucide-react";

export default function ShopLayout() {
  const navigate = useNavigate();

  // USAR EL CONTEXTO DEL CARRITO (sincronización automática)
  const { user, cart, addToCart, removeFromCart, clearCart, cartCount } =
    useCart();

  const [isCartOpen, setIsCartOpen] = useState(false);

  // Estados Cupón
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);

  // Estado para el Método de Pago
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // --- EFECTO PARA CACHEAR LA CONFIGURACIÓN (LOGO) ---
  useEffect(() => {
    const syncSettings = async () => {
      try {
        const q = await getDocs(collection(db, "settings"));
        if (!q.empty) {
          const settingsData = q.docs[0].data();
          localStorage.setItem("shopSettings", JSON.stringify(settingsData));
          window.dispatchEvent(new Event("storage"));
        }
      } catch (error) {
        console.error("Error sincronizando settings:", error);
      }
    };
    syncSettings();
  }, []);

  // Cargar métodos de pago
  useEffect(() => {
    const loadPayments = () => {
      const savedPayments = JSON.parse(
        localStorage.getItem("shopPayments") || "[]",
      );
      setPaymentMethods(savedPayments.filter((p) => p.status === "active"));
    };
    loadPayments();
    window.addEventListener("storage", loadPayments);
    return () => window.removeEventListener("storage", loadPayments);
  }, []);

  // --- FUNCIÓN ACTUALIZAR CANTIDAD ---
  const updateQty = (productId, delta) => {
    const item = cart.find((i) => i.id === productId);
    if (!item) return;

    const newQty = (item.quantity || 1) + delta;
    const stockLimit = Number(item.stock) || 999;

    if (newQty < 1) {
      removeFromCart(productId);
      return;
    }

    if (newQty > stockLimit) {
      toast.error(`Stock máximo: ${stockLimit}`);
      return;
    }

    // Remover el item y agregarlo con la nueva cantidad
    removeFromCart(productId);
    setTimeout(() => {
      addToCart(item, newQty);
    }, 0);
  };

  const handleApplyCoupon = () => {
    const allCoupons = JSON.parse(localStorage.getItem("shopCoupons") || "[]");
    const found = allCoupons.find(
      (c) => c.code === couponCode.toUpperCase() && c.active,
    );
    if (found) {
      setAppliedDiscount({ code: found.code, percent: found.discount });
      toast.success(`Cupón aplicado: -${found.discount}%`);
    } else {
      setAppliedDiscount(null);
      toast.error("Cupón no válido.");
    }
  };

  // Cálculos
  const subtotal = cart.reduce(
    (acc, item) => acc + item.price * (item.quantity || 1),
    0,
  );
  const discountAmount = appliedDiscount
    ? (subtotal * appliedDiscount.percent) / 100
    : 0;
  const total = subtotal - discountAmount;

  const handleCheckout = async () => {
    if (paymentMethods.length > 0 && !selectedPayment) {
      alert("Por favor selecciona un método de pago para continuar.");
      return;
    }

    // PAGO CON BILLETERA
    if (selectedPayment?.type === "Billetera") {
      if (!user) {
        toast.error("Inicia sesión para pagar con billetera");
        return;
      }

      try {
        await runTransaction(db, async (transaction) => {
          const userRef = doc(db, "clients", user.email);
          const userSnap = await transaction.get(userRef);
          if (!userSnap.exists()) throw "Perfil de usuario no encontrado";

          const currentBalance = Number(userSnap.data().balance) || 0;
          if (currentBalance < total) throw "Saldo insuficiente en billetera";

          transaction.update(userRef, { balance: currentBalance - total });

          const orderRef = doc(collection(db, "orders"));
          transaction.set(orderRef, {
            customerEmail: user.email,
            items: cart,
            total: total,
            paymentMethod: "Billetera",
            status: "paid",
            createdAt: serverTimestamp(),
          });
        });

        toast.success("Pago exitoso.");
        clearCart();
        setIsCartOpen(false);
        navigate("/thank-you");
        return;
      } catch (error) {
        toast.error(
          typeof error === "string" ? error : "Error al procesar el pago",
        );
        return;
      }
    }

    // PAGO POR WHATSAPP
    const settings = JSON.parse(localStorage.getItem("shopSettings") || "{}");
    let rawPhone = settings.phone || settings.whatsapp || "";
    let phone = rawPhone.replace(/\D/g, "");
    if (phone.length === 10) phone = `57${phone}`;
    else if (phone.length > 0 && !phone.startsWith("57")) phone = `57${phone}`;
    if (!phone) phone = "573000000000";

    let message = `Hola, quiero realizar el siguiente pedido:\n\n`;
    cart.forEach((item) => {
      message += `• ${item.quantity || 1}x ${item.title} - $${item.price.toLocaleString()}\n`;
    });
    message += `\nSubtotal: $${subtotal.toLocaleString()}`;
    if (appliedDiscount) {
      message += `\n🎁 Cupón (${appliedDiscount.code}): -${appliedDiscount.percent}%`;
      message += `\n✅ Descuento: -$${discountAmount.toLocaleString()}`;
    }
    message += `\n\n*TOTAL A PAGAR: $${total.toLocaleString()}*`;
    if (selectedPayment)
      message += `\n\n💳 *Método de Pago:* ${selectedPayment.type}`;

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col relative">
      <Navbar cartCount={cartCount} onOpenCart={() => setIsCartOpen(true)} />
      <main className="flex-grow w-full">
        <Outlet context={{ addToCart }} />
      </main>
      <Footer />

      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isCartOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsCartOpen(false)}
      />

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
          <h2 className="font-bold text-xl flex items-center gap-2 text-slate-800">
            <ShoppingCart className="text-blue-600" /> Tu Carrito{" "}
            <span className="text-sm font-normal text-slate-400">
              ({cart.length})
            </span>
          </h2>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 bg-gray-50 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <ShoppingCart size={64} className="opacity-20" />
              <p>Tu carrito está vacío</p>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-blue-600 font-bold hover:underline text-sm"
              >
                Seguir comprando
              </button>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {cart.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex gap-4"
                >
                  <div className="w-16 h-16 bg-gray-50 rounded-lg flex-shrink-0">
                    {item.image && (
                      <img
                        src={item.image}
                        alt=""
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 text-sm line-clamp-2">
                      {item.title}
                    </h4>
                    <div className="flex justify-between items-end mt-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                          Precio Unit.
                        </span>
                        <span className="font-bold text-blue-600 text-sm">
                          ${item.price.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          className="p-1.5 hover:bg-gray-200 transition text-slate-600"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="px-3 text-xs font-bold text-slate-800 min-w-[24px] text-center">
                          {item.quantity || 1}
                        </span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          className="p-1.5 hover:bg-gray-200 transition text-slate-600"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="mt-6 border-t border-slate-200 pt-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                  <CreditCard size={14} /> Selecciona Método de Pago
                </h3>
                <div className="space-y-3">
                  <div
                    onClick={() => setSelectedPayment({ type: "Billetera" })}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedPayment?.type === "Billetera" ? "bg-blue-50 border-blue-500 ring-1" : "bg-white border-slate-200"}`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Wallet size={16} className="text-blue-600" />
                        <span className="font-bold text-sm text-slate-800">
                          Mi Billetera
                        </span>
                      </div>
                      <span className="text-xs font-bold text-green-600">
                        ${(Number(user?.balance) || 0).toLocaleString()}
                      </span>
                    </div>
                    {user && (Number(user.balance) || 0) < total && (
                      <div className="mt-2 flex justify-between items-center">
                        <p className="text-[10px] text-red-500 font-bold italic">
                          Saldo insuficiente
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsCartOpen(false);
                            navigate("/mi-cuenta");
                          }}
                          className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded font-bold"
                        >
                          Recargar
                        </button>
                      </div>
                    )}
                  </div>

                  {paymentMethods.map((pm) => (
                    <div
                      key={pm.id}
                      onClick={() => setSelectedPayment(pm)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedPayment?.id === pm.id ? "bg-blue-50 border-blue-500 ring-1" : "bg-white border-slate-200"}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm">{pm.type}</span>
                        {selectedPayment?.id === pm.id && (
                          <Check size={16} className="text-blue-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] shrink-0 z-20">
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                placeholder="CÓDIGO CUPÓN"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold focus:border-blue-500 uppercase outline-none"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={!!appliedDiscount}
              />
              <button
                onClick={
                  appliedDiscount
                    ? () => {
                        setAppliedDiscount(null);
                        setCouponCode("");
                      }
                    : handleApplyCoupon
                }
                className={`px-3 py-2 rounded-lg text-xs font-bold ${appliedDiscount ? "bg-red-100 text-red-600" : "bg-slate-800 text-white"}`}
              >
                {appliedDiscount ? "X" : "Aplicar"}
              </button>
            </div>

            <div className="space-y-1 mb-4 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString()}</span>
              </div>
              {appliedDiscount && (
                <div className="flex justify-between text-green-600 font-bold">
                  <span>Desc.</span>
                  <span>-${discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-black text-slate-900 pt-2 border-t">
                <span>Total</span>
                <span>${total.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={
                selectedPayment?.type === "Billetera" &&
                Number(user?.balance || 0) < total
              }
              className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              Completar Pedido <ArrowRight size={20} />
            </button>
          </div>
        )}
      </div>
      <WhatsAppFloat hide={isCartOpen} />
    </div>
  );
}
