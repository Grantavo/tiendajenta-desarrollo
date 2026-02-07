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
  query,
  where,
  onSnapshot,
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
  Smartphone,
  Truck,
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

  // --- EFECTO PARA CACHEAR LA CONFIGURACIÓN (LOGO Y BANNERS) ---
  const [topBar, setTopBar] = useState(null);

  useEffect(() => {
    const syncSettings = async () => {
      try {
        // 1. Settings (Logo, Nombre, Teléfono)
        const q = await getDocs(collection(db, "settings"));
        if (!q.empty) {
          const settingsData = q.docs[0].data();
          localStorage.setItem("shopSettings", JSON.stringify(settingsData));
          window.dispatchEvent(new Event("storage"));
        }

        // 2. Design (Top Bar)
        const designDoc = await getDoc(doc(db, "banners", "design"));
        if (designDoc.exists()) {
           setTopBar(designDoc.data().topBar || null);
        }

      } catch (error) {
        console.error("Error sincronizando settings:", error);
      }
    };
    syncSettings();

    // 3. Shipping (Real-time Listener)
    const unsubShipping = onSnapshot(
      doc(db, "shipping_config", "standard_rate"),
      (docSnap) => {
        if (docSnap.exists()) {
          const cost = docSnap.data().cost;
          if (cost !== undefined) {
             localStorage.setItem("shopShippingCost", cost);
          }
        } else {
             localStorage.setItem("shopShippingCost", "0");
        }
        window.dispatchEvent(new Event("storage"));
      }
    );

    return () => unsubShipping();
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

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    try {
      // 1. Buscar el cupón en Firebase (case insensitive en teoría, pero Firestore es sensible, así que guardamos/buscamos mayúsculas)
      const q = query(
        collection(db, "coupons"),
        where("code", "==", couponCode.toUpperCase()),
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        toast.error("El código no existe.");
        setAppliedDiscount(null);
        return;
      }

      const coupon = snap.docs[0].data();

      // 2. Validar estado ACTIVO
      if (!coupon.active) {
        toast.error("El cupón está inactivo.");
        setAppliedDiscount(null);
        return;
      }

      // 3. Validar FECHA DE VENCIMIENTO (si existe)
      if (coupon.expiryDate) {
        const now = new Date();
        const expiry = new Date(coupon.expiryDate);
        // Ajustamos al final del día para ser amigables
        expiry.setHours(23, 59, 59, 999);

        if (now > expiry) {
          toast.error("El cupón ha vencido.");
          setAppliedDiscount(null);
          return;
        }
      }

      // 4. Aplicar descuento
      setAppliedDiscount({ code: coupon.code, percent: coupon.discount });
      toast.success(`¡Descuento de ${coupon.discount}% aplicado!`);
    } catch (error) {
      console.error("Error validando cupón:", error);
      toast.error("Error al validar el cupón.");
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

  // OBTENER COSTO DE ENVÍO (Desde localStorage/shipping_config + Lógica Ciudad)
  const [shippingCost, setShippingCost] = useState(0);

  useEffect(() => {
    const updateShipping = () => {
        const standardRate = Number(localStorage.getItem("shopShippingCost")) || 0;
        
        // Lógica condicional: Si es Pasto -> 0
        if (user?.city && user.city.toLowerCase().includes("pasto")) {
            setShippingCost(0);
        } else {
            setShippingCost(standardRate);
        }
    };
    
    updateShipping();
    window.addEventListener("storage", updateShipping);
    return () => window.removeEventListener("storage", updateShipping);
  }, [user]); // Re-calcular si cambia el usuario (o su ciudad)

  const total = subtotal - discountAmount + shippingCost;

  const handleCheckout = async () => {
    // 1. VALIDACIÓN DE MÉTODO DE PAGO
    if (!selectedPayment) {
      toast.error("Selecciona un método de pago para continuar.");
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
    if (shippingCost > 0) {
      message += `\n🚚 Envío: $${shippingCost.toLocaleString()}`;
    }
    message += `\n\n*TOTAL A PAGAR: $${total.toLocaleString()}*`;
    
    // MÉTODO DE PAGO
    if (selectedPayment) {
        message += `\n\n💳 *Método de Pago:* ${selectedPayment.type}`;
    }

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col relative">
      {/* TOP BAR GLOBAL */}
      {topBar && topBar.isActive !== false && (
        <div
          className="w-full py-2 px-4 text-center text-xs md:text-sm font-bold relative z-50 transition-colors"
          style={{
            backgroundColor: topBar.bgColor || "#1e293b",
            color: topBar.textColor || "#fff",
          }}
        >
          {topBar.text}
        </div>
      )}

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
                  <CreditCard size={14} /> Método de Pago (Obligatorio)
                </h3>
                <div className="space-y-3">
                  
                  {/* OPCIÓN 1: BILLETERA (Solo si tiene saldo) */}
                  {(() => {
                    // Safe Balance Parsing
                    // Convert "20.000" -> 20000, "20,000" -> 20000
                    const rawBalance = user?.balance ? String(user.balance) : "0";
                    const cleanBalance = rawBalance.replace(/[.,]/g, ""); 
                    const balanceNum = Number(cleanBalance) || 0;
                    
                    if (!user || balanceNum <= 0) return null;

                    return (
                  <div
                    onClick={() => setSelectedPayment({ type: "Billetera", id: "wallet" })}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedPayment?.id === "wallet" ? "bg-blue-50 border-blue-500 ring-1" : "bg-white border-slate-200"}`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Wallet size={16} className="text-blue-600" />
                        <div className="flex flex-col">
                            <span className="font-bold text-sm text-slate-800">
                            Mi Billetera
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                                Saldo: ${balanceNum.toLocaleString()}
                            </span>
                        </div>
                      </div>
                      {selectedPayment?.id === "wallet" && (
                          <Check size={16} className="text-blue-600" />
                      )}
                    </div>
                    {balanceNum < total && (
                      <div className="mt-2 flex justify-between items-center bg-red-50 p-2 rounded-lg border border-red-100">
                        <p className="text-[10px] text-red-500 font-bold italic flex-1">
                          Saldo insuficiente
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsCartOpen(false); // Cerrar carrito
                            navigate("/perfil", { state: { openRecharge: true } }); // Ir a perfil y abrir modal
                          }}
                          className="ml-2 text-[10px] bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm hover:bg-green-700 transition"
                        >
                          Recargar
                        </button>
                      </div>
                    )}
                  </div>
                  );
                  })()}

                  {/* OPCIÓN 2: COORDINAR POR WHATSAPP (Siempre disponible) */}
                  <div
                    onClick={() => setSelectedPayment({ type: "Coordinar por WhatsApp", id: "whatsapp" })}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedPayment?.id === "whatsapp" ? "bg-green-50 border-green-500 ring-1" : "bg-white border-slate-200"}`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Smartphone size={16} className="text-green-600" />
                        <span className="font-bold text-sm text-slate-800">
                          Coordinar por WhatsApp
                        </span>
                      </div>
                      {selectedPayment?.id === "whatsapp" && (
                        <Check size={16} className="text-green-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 ml-6">
                      Nequi, Bancolombia, Efectivo...
                    </p>
                  </div>

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
              
              {/* COSTO DE ENVÍO */}
              <div className="flex justify-between items-center text-slate-600 py-1">
                <div className="flex items-center gap-2">
                  <Truck size={16} />
                  <span>Envío</span>
                </div>
                <span className="font-bold text-slate-800 text-right">
                  {shippingCost > 0 ? `$${shippingCost.toLocaleString()}` : "Gratis Para Pasto"}
                </span>
              </div>

              <div className="flex justify-between text-xl font-black text-slate-900 pt-2 border-t mt-2">
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
