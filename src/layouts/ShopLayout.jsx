import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import WhatsAppFloat from "../components/WhatsAppFloat";

// Iconos
import {
  ShoppingCart,
  X,
  Tag,
  Trash2,
  ArrowRight,
  CreditCard,
  Copy,
  Check,
} from "lucide-react";

export default function ShopLayout() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);

  // Estados Cupón
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [couponMessage, setCouponMessage] = useState({ type: "", text: "" });

  // Estado para el Método de Pago
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Cargar datos
  useEffect(() => {
    const loadData = () => {
      // Carrito
      const savedCart = JSON.parse(localStorage.getItem("shopCart") || "[]");
      setCartItems(savedCart);

      // Pagos (Solo activos)
      const savedPayments = JSON.parse(
        localStorage.getItem("shopPayments") || "[]"
      );
      setPaymentMethods(savedPayments.filter((p) => p.status === "active"));
    };
    loadData();
    window.addEventListener("storage", loadData);
    return () => window.removeEventListener("storage", loadData);
  }, [isCartOpen]);

  // Funciones Carrito
  const addToCart = (product) => {
    const existing = cartItems.find((item) => item.id === product.id);
    let newCart;
    if (existing) {
      newCart = cartItems.map((item) =>
        item.id === product.id ? { ...item, qty: (item.qty || 1) + 1 } : item
      );
    } else {
      newCart = [...cartItems, { ...product, qty: 1 }];
    }
    setCartItems(newCart);
    localStorage.setItem("shopCart", JSON.stringify(newCart));
    setIsCartOpen(true);
  };

  const removeItem = (id) => {
    const newCart = cartItems.filter((i) => i.id !== id);
    setCartItems(newCart);
    localStorage.setItem("shopCart", JSON.stringify(newCart));
    if (newCart.length === 0) setAppliedDiscount(null);
  };

  const handleApplyCoupon = () => {
    setCouponMessage({ type: "", text: "" });
    const allCoupons = JSON.parse(localStorage.getItem("shopCoupons") || "[]");
    const found = allCoupons.find(
      (c) => c.code === couponCode.toUpperCase() && c.active
    );
    if (found) {
      setAppliedDiscount({ code: found.code, percent: found.discount });
      setCouponMessage({
        type: "success",
        text: `¡Éxito! -${found.discount}% aplicado.`,
      });
    } else {
      setAppliedDiscount(null);
      setCouponMessage({ type: "error", text: "Cupón no válido." });
    }
  };

  // Cálculos
  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * (item.qty || 1),
    0
  );
  const discountAmount = appliedDiscount
    ? (subtotal * appliedDiscount.percent) / 100
    : 0;
  const total = subtotal - discountAmount;

  // --- FINALIZAR COMPRA (Checkout) ---
  const handleCheckout = () => {
    // Validación: Obligar a elegir método de pago si existen opciones
    if (paymentMethods.length > 0 && !selectedPayment) {
      alert("Por favor selecciona un método de pago para continuar.");
      return;
    }

    const settings = JSON.parse(localStorage.getItem("shopSettings") || "{}");

    // --- LÓGICA DE NÚMERO CON INDICATIVO AUTOMÁTICO ---
    let rawPhone = settings.phone || settings.whatsapp || "";
    let phone = rawPhone.replace(/\D/g, ""); // Solo números

    // Si tiene 10 dígitos (ej: 3001234567), asumimos Colombia y agregamos 57
    if (phone.length === 10) {
      phone = `57${phone}`;
    }
    // Si no empieza por 57 y no está vacío, lo agregamos por seguridad
    else if (phone.length > 0 && !phone.startsWith("57")) {
      phone = `57${phone}`;
    }
    // Fallback por defecto si no hay nada configurado
    if (!phone) phone = "573000000000";
    // ----------------------------------------------------

    let message = `Hola, quiero realizar el siguiente pedido:\n\n`;
    cartItems.forEach((item) => {
      message += `• ${item.qty || 1}x ${
        item.title
      } - $${item.price.toLocaleString()}\n`;
    });

    message += `\nSubtotal: $${subtotal.toLocaleString()}`;
    if (appliedDiscount) {
      message += `\n🎁 Cupón (${appliedDiscount.code}): -${appliedDiscount.percent}%`;
      message += `\n✅ Descuento: -$${discountAmount.toLocaleString()}`;
    }
    message += `\n\n*TOTAL A PAGAR: $${total.toLocaleString()}*`;

    // Incluir método de pago seleccionado
    if (selectedPayment) {
      message += `\n\n💳 *Método de Pago:* ${selectedPayment.type}`;
      // Opcional: Incluir la cuenta para agilizar
      // message += `\nCuenta: ${selectedPayment.accountNumber}`;
    }

    message += `\n\nQuedo atento para enviar el comprobante.`;

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col relative">
      <Navbar
        cartCount={cartItems.length}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <main className="flex-grow w-full">
        <Outlet context={{ addToCart }} />
      </main>
      <Footer />

      {/* --- SIDEBAR CARRITO --- */}
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
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
          <h2 className="font-bold text-xl flex items-center gap-2 text-slate-800">
            <ShoppingCart className="text-blue-600" /> Tu Carrito{" "}
            <span className="text-sm font-normal text-slate-400">
              ({cartItems.length})
            </span>
          </h2>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Lista Productos */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50 custom-scrollbar">
          {cartItems.length === 0 ? (
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
              {cartItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex gap-4"
                >
                  <div className="w-16 h-16 bg-gray-50 rounded-lg flex-shrink-0">
                    {item.images && item.images[0] && (
                      <img
                        src={item.images[0]}
                        alt=""
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 text-sm line-clamp-2">
                      {item.title}
                    </h4>
                    <div className="flex justify-between items-end mt-1">
                      <span className="font-bold text-blue-600 text-sm">
                        ${item.price.toLocaleString()}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* --- ZONA DE PAGO (INTEGRADA) --- */}
              {paymentMethods.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-6">
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                    <CreditCard size={14} /> Selecciona Método de Pago
                  </h3>
                  <div className="space-y-3">
                    {paymentMethods.map((pm) => (
                      <div
                        key={pm.id}
                        onClick={() => setSelectedPayment(pm)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedPayment?.id === pm.id
                            ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span
                            className={`font-bold text-sm ${
                              pm.type === "Nequi"
                                ? "text-purple-800"
                                : "text-slate-800"
                            }`}
                          >
                            {pm.type}
                          </span>
                          {selectedPayment?.id === pm.id && (
                            <Check size={16} className="text-blue-600" />
                          )}
                        </div>

                        {/* Detalles solo si está seleccionado */}
                        {selectedPayment?.id === pm.id && (
                          <div className="text-xs text-slate-600 mt-2 bg-white/50 p-2 rounded border border-blue-100">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-mono font-bold select-all">
                                {pm.accountNumber}
                              </span>
                              <span className="text-[10px] text-blue-400">
                                Copiar número
                              </span>
                            </div>
                            {pm.instructions && (
                              <p className="italic opacity-80">
                                {pm.instructions}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Totales */}
        {cartItems.length > 0 && (
          <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] shrink-0 z-20">
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="CÓDIGO CUPÓN"
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-500 uppercase"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  disabled={!!appliedDiscount}
                />
                {appliedDiscount ? (
                  <button
                    onClick={() => {
                      setAppliedDiscount(null);
                      setCouponCode("");
                      setCouponMessage({ type: "", text: "" });
                    }}
                    className="bg-red-100 text-red-600 px-3 py-2 rounded-lg text-xs font-bold"
                  >
                    X
                  </button>
                ) : (
                  <button
                    onClick={handleApplyCoupon}
                    className="bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                  >
                    Aplicar
                  </button>
                )}
              </div>
              {couponMessage.text && (
                <p
                  className={`text-[10px] mt-1 font-bold ${
                    couponMessage.type === "success"
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  {couponMessage.text}
                </p>
              )}
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
              <div className="flex justify-between text-xl font-black text-slate-900 pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>${total.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition shadow-lg shadow-green-600/30 flex items-center justify-center gap-2"
            >
              Completar Pedido <ArrowRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Botón Flotante de WhatsApp */}
      <WhatsAppFloat />
    </div>
  );
}
