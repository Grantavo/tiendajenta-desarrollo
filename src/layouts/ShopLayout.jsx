import React, { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import WhatsAppFloat from "../components/WhatsAppFloat";
import AuthModal from "../components/AuthModal"; // Importamos AuthModal
import { User } from "lucide-react"; // Asegurar que User esté importado

// IMPORTAR EL CONTEXTO DEL CARRITO (YA TIENE SINCRONIZACIÓN)
import { useCart } from "../context/CartContext";

// FIREBASE
import { db, auth } from "../firebase/config";
import {
  onSnapshot,
  getDoc,
  increment,
  collection,
  getDocs,
  doc,
  runTransaction,
  serverTimestamp,
  query,
  where,
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
import useIdleTimer from "../hooks/useIdleTimer";
import { useCallback } from "react";
import BoldPaymentButton from "../components/BoldPaymentButton";

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
  const [boldPendingOrder, setBoldPendingOrder] = useState(null); // {orderId, amount, apiKey, secretKey}

  // Estado para el Modal de Login (Controlado localmente o via evento)
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // --- INTERCEPTAR BOTÓN ATRÁS DE ANDROID (CARRITO) ---
  const wasCartOpen = useRef(false);

  useEffect(() => {
    const handlePopState = (e) => {
      if (wasCartOpen.current) {
        // El usuario presionó atrás mientras el carrito estaba abierto
        wasCartOpen.current = false;
        setIsCartOpen(false);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (isCartOpen && !wasCartOpen.current) {
      // Se abre el carrito: empujar un estado silencioso
      window.history.pushState({ modal: "cart" }, "");
      wasCartOpen.current = true;
    } else if (!isCartOpen && wasCartOpen.current) {
      // Se cerró mediante botón 'X' o por código UI, sin ser 'Atrás'
      wasCartOpen.current = false;
      // Remueve estado silencioso sin navegar, previniendo doble click atrás futuro
      if (window.history.state?.modal === "cart") {
        window.history.back();
      }
    }
  }, [isCartOpen]);

  // --- EFECTO PARA CACHEAR LA CONFIGURACIÓN (LOGO Y BANNERS) ---
  const [topBar, setTopBar] = useState(null);

  useEffect(() => {
    const syncSettings = async () => {
      try {
        // 1. Settings (Logo, Nombre, Teléfono) - Usamos el doc 'shop' directamente
        const shopDoc = await getDoc(doc(db, "settings", "shop"));
        if (shopDoc.exists()) {
          const settingsData = shopDoc.data();
          localStorage.setItem("shopSettings", JSON.stringify(settingsData));
          // Guardar logo por separado para que el spinner lo encuentre rápido
          if (settingsData.logo) {
            localStorage.setItem("shopLogo", settingsData.logo);
          }
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

  // --- NUEVO: AUTO LOGOUT CLIENTES (60 MINUTOS) ---
  const handleClientIdle = useCallback(() => {
    // Solo cerrar si hay usuario (para no molestar a visitantes anónimos)
    if (user) {
      toast.warning("Sesión cerrada por inactividad");
      // Usamos el logout del contexto que limpia todo
      // (Asumimos que 'logout' está disponible en el contexto, si no, lo usamos desde useCart)
      // Como useCart ya nos da 'logout', lo usamos directo si lo desestructuramos arriba
      // Pero arriba no desestructuramos 'logout', así que lo agregamos ahora.
      window.dispatchEvent(new Event("auth-change")); // Forzar evento por si acaso
      sessionStorage.removeItem("shopUser");
      localStorage.removeItem("shopUser");
      window.location.reload(); // Recargar para limpiar estados
    }
  }, [user]);

  useIdleTimer({
    timeout: 1000 * 60 * 60, // 60 minutos
    onIdle: handleClientIdle,
  });

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

  // --- GUARDIÁN DE ADMIN (Evita que el Admin navegue la tienda por error) ---
  // MODIFICADO: Solo redirigimos a /admin si explícitamente estamos en una página de login o recién logueados.
  // Ya NO forzamos la redirección todo el tiempo para evitar la pantalla blanca cuando un admin decide visitar jenta.online
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("preview") === "admin") {
      sessionStorage.setItem("adminPreview", "true");
    }
  }, []);

  // --- FUNCIÓN ACTUALIZAR CANTIDAD ---
  const updateQty = (cartKey, delta) => {
    const item = cart.find((i) => (i.cartKey || i.id) === cartKey);
    if (!item) return;

    const newQty = (item.quantity || 1) + delta;
    const stockLimit = Number(item.stock) || 999;

    if (newQty < 1) {
      removeFromCart(cartKey);
      return;
    }

    if (newQty > stockLimit) {
      toast.error(`Stock máximo: ${stockLimit}`);
      return;
    }

    // Remover el item y agregarlo con la nueva cantidad preservando la variante
    removeFromCart(cartKey);
    setTimeout(() => {
      addToCart(item, newQty, item.variant || null);
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
        // 0. Generar ID Secuencial (Atomic Increment)
        // Usamos una referencia a counters/orders
        const counterRef = doc(db, "counters", "orders");
        let newOrderId = "";

        await runTransaction(db, async (transaction) => {
          // ===== FASE 1: TODAS LAS LECTURAS =====
          const counterSnap = await transaction.get(counterRef);

          const userRef = doc(db, "clients", user.id);
          const userSnap = await transaction.get(userRef);

          if (!userSnap.exists()) throw "Perfil de usuario no encontrado";

          // Leer todos los productos
          let serverSubtotal = 0;
          const validatedItems = [];

          for (const item of cart) {
            const productRef = doc(db, "products", item.id);
            const productSnap = await transaction.get(productRef);

            if (!productSnap.exists()) throw `El producto "${item.title}" ya no existe.`;

            const pData = productSnap.data();
            const realPrice = Number(pData.price);
            const currentStock = Number(pData.stock);
            const qty = Number(item.quantity || item.qty || 1);

            if (currentStock < qty) throw `Stock insuficiente para "${pData.title}" (Quedan: ${currentStock}).`;

            serverSubtotal += realPrice * qty;
            validatedItems.push({
              ...item,
              price: realPrice,
              qty: qty,
              ref: productRef
            });
          }

          // Validaciones con datos leídos
          const serverDiscount = appliedDiscount
            ? (serverSubtotal * appliedDiscount.percent) / 100
            : 0;
          const serverTotal = serverSubtotal - serverDiscount + shippingCost;

          const rawBalance = String(userSnap.data().balance || "0");
          const cleanBalance = Number(rawBalance.replace(/[.,]/g, "")) || 0;

          if (cleanBalance < serverTotal) throw `Saldo insuficiente. Total real: $${serverTotal.toLocaleString()}`;

          // Calcular nuevo ID
          let nextId = 1001;
          if (counterSnap.exists()) {
            nextId = (counterSnap.data().seq || 1000) + 1;
          }
          newOrderId = `P${nextId}`;

          // ===== FASE 2: TODAS LAS ESCRITURAS =====
          transaction.set(counterRef, { seq: nextId }, { merge: true });

          transaction.update(userRef, {
            balance: increment(-serverTotal)
          });

          for (const item of validatedItems) {
            transaction.update(item.ref, {
              stock: increment(-item.qty)
            });
          }

          const orderRef = doc(db, "orders", newOrderId);
          transaction.set(orderRef, {
            id: newOrderId,
            client: user.name || "Cliente",
            customerEmail: user.email,
            customerName: user.name || "Cliente",
            clientId: user.id,
            phone: user.phone || "",
            address: user.address || "",
            city: user.city || "",
            items: validatedItems.map(({ ref, ...rest }) => rest),
            subtotal: serverSubtotal,
            discount: serverDiscount,
            shipping: shippingCost,
            total: serverTotal,
            paymentMethod: "Billetera",
            isPaid: true,
            stockDeducted: true,
            status: "Pendiente",
            createdAt: serverTimestamp(),
            date: new Date().toLocaleDateString("es-CO", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
          });
        });

        toast.success("Pago con billetera exitoso.");
        clearCart();
        setIsCartOpen(false);
        // PASAR ESTADO A THANK-YOU PARA EVITAR REDIRECCIÓN
        navigate("/thank-you", { state: { orderId: newOrderId, total, items: cart, paymentMethod: "Billetera" } });
        return;
      } catch (error) {
        toast.error(
          typeof error === "string" ? error : "Error al procesar el pago",
        );
        return;
      }
    }

    // PAGO CON BOLD
    if (selectedPayment?.type === "Bold") {
      try {
        const boldConfigRef = doc(db, "settings", "bold");
        const boldConfigSnap = await getDoc(boldConfigRef);

        if (!boldConfigSnap.exists() || !boldConfigSnap.data().enabled) {
          toast.error("Bold no está configurado. Contacta al administrador.");
          return;
        }

        const boldConfigData = boldConfigSnap.data();
        const isSandbox = boldConfigData.mode === "sandbox";
        const apiKey = isSandbox ? boldConfigData.sandboxApiKey : boldConfigData.productionApiKey;
        const secretKey = isSandbox ? boldConfigData.sandboxSecretKey : boldConfigData.productionSecretKey;

        if (!apiKey || !secretKey) {
          toast.error("Faltan llaves de Bold para el modo actual. Contacta al administrador.");
          return;
        }

        // Calcular total asegurando cast puro a Number para evitar bug de concatenación String (ej: 1000 + "200" = "1000200")
        const subtotal = cart.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
        
        let shipping = 0;
        try {
          const rawShip = localStorage.getItem("shopShippingCost");
          if (rawShip) shipping = Number(rawShip.replace(/[^0-9.-]+/g,"")) || 0;
        } catch(e) {}

        const discount = appliedDiscount
          ? appliedDiscount.type === "percentage"
            ? (subtotal * (Number(appliedDiscount.value) || 0)) / 100
            : (Number(appliedDiscount.value) || 0)
          : 0;

        const totalAmount = Math.round(subtotal + shipping - discount);

        // Crear orden y actualizar contador en UNA SOLA transacción atómica
        const { newOrderId, boldOrderId } = await runTransaction(db, async (tx) => {
          const counterRef = doc(db, "counters", "orders");
          const counterSnap = await tx.get(counterRef);
          
          let nextId = 1001;
          if (counterSnap.exists()) {
            // Usar 'seq' para ser consistente con el flujo de WhatsApp
            nextId = (counterSnap.data().seq || 1000) + 1;
          }
          
          const generatedId = `P${nextId}`; // Formato consistente P1001
          const boldId = `JENTA-${generatedId}-${Date.now()}`;
          const session = JSON.parse(sessionStorage.getItem("shopUser") || "{}");

          const orderData = {
            orderId: generatedId,
            boldOrderId: boldId,
            client: session.name || session.email || "Cliente",
            clientId: session.id || auth.currentUser?.uid || "guest",
            clientName: session.name || session.email || "Cliente",
            clientEmail: session.email || "",
            phone: session.phone || "",
            address: session.address || "",
            city: session.city || "",
            items: cart,
            subtotal,
            shipping,
            discount,
            total: totalAmount,
            status: "Pendiente Bold",
            paymentMethod: "Bold",
            stockDeducted: false, // Bold no descuenta stock en el checkout
            createdAt: serverTimestamp(),
          };

          // Actualizar contador
          tx.set(counterRef, { seq: nextId }, { merge: true });
          
          // Crear la orden
          tx.set(doc(db, "orders", generatedId), orderData);

          return { newOrderId: generatedId, boldOrderId: boldId };
        });

        const session = JSON.parse(sessionStorage.getItem("shopUser") || "{}");

        // Datos del cliente para precargar en Bold
        const customerData = {
          email: session.email || "",
          fullName: session.name || "Cliente",
          phone: session.phone || "",
          dialCode: "+57",
        };

        // Redirect URL al thank-you (Bold agregará bold-order-id y bold-tx-status)
        const redirectUrl = `${window.location.origin}/thank-you`;

        setBoldPendingOrder({
          orderId: boldOrderId,
          amount: totalAmount,
          apiKey: apiKey,
          secretKey: secretKey,
          redirectUrl,
          orderFirestoreId: newOrderId,
          customerData: JSON.stringify(customerData),
        });

        toast.info("¡Pedido creado! Presiona Pagar con Bold para completar.", {
          description: "La pasarela de pago se abrirá a continuación.",
        });
      } catch (error) {
        console.error("Error preparando pago Bold:", error);
        toast.error("Error al preparar el pago con Bold");
      }
      return;
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
      const variantLabel = item.variant ? ` (${item.variant})` : "";
      message += `• ${item.quantity || 1}x ${item.title}${variantLabel} - $${item.price.toLocaleString()}\n`;
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
    message += `\n💳 Método: ${selectedPayment.type}`;

    try {
      // 0. Generar ID Secuencial (Atomic Increment)
      const counterRef = doc(db, "counters", "orders");
      let newOrderId = "";

      console.log("🔵 [CHECKOUT WA] Iniciando transacción...");
      console.log("🔵 [CHECKOUT WA] User (sessionStorage):", user?.id, user?.email);
      console.log("🔵 [CHECKOUT WA] auth.currentUser:", auth.currentUser?.uid, auth.currentUser?.email);

      if (!auth.currentUser) {
        toast.error("Tu sesión expiró. Por favor inicia sesión de nuevo.");
        setIsAuthOpen(true);
        return;
      }

      await runTransaction(db, async (transaction) => {
        // ===== FASE 1: TODAS LAS LECTURAS =====
        console.log("🟡 [PASO 1] Leyendo contador...");
        const counterSnap = await transaction.get(counterRef);
        console.log("✅ [PASO 1] Contador leído OK. Existe:", counterSnap.exists());

        console.log("🟡 [PASO 2] Leyendo productos del carrito...");
        const validatedItems = [];

        for (const item of cart) {
          const productRef = doc(db, "products", item.id);
          console.log("  🟡 Leyendo producto:", item.id, item.title);
          const productSnap = await transaction.get(productRef);
          console.log("  ✅ Producto leído OK:", item.title);

          if (!productSnap.exists()) throw `El producto "${item.title}" ya no existe.`;

          const pData = productSnap.data();
          const currentStock = Number(pData.stock);
          const qty = Number(item.quantity || item.qty || 1);

          if (currentStock < qty) throw `Stock insuficiente para "${pData.title}" (Quedan: ${currentStock}).`;

          validatedItems.push({
            ...item,
            qty: qty,
            ref: productRef
          });
        }

        // Calcular nuevo ID
        let nextId = 1001;
        if (counterSnap.exists()) {
          nextId = (counterSnap.data().seq || 1000) + 1;
        }
        newOrderId = `P${nextId}`;
        console.log("✅ [PASO 2] Todos los productos validados. Nuevo ID:", newOrderId);

        // ===== FASE 2: TODAS LAS ESCRITURAS =====
        console.log("🟡 [PASO 3] Escribiendo contador...");
        transaction.set(counterRef, { seq: nextId }, { merge: true });

        console.log("🟡 [PASO 4] Actualizando stock de productos...");
        for (const item of validatedItems) {
          transaction.update(item.ref, {
            stock: increment(-item.qty)
          });
        }

        console.log("🟡 [PASO 5] Creando orden:", newOrderId);
        const orderDocRef = doc(db, "orders", newOrderId);
        transaction.set(orderDocRef, {
          id: newOrderId,
          customerEmail: user?.email || "Sin correo",
          customerName: user?.name || "Cliente WhatsApp",
          clientId: user?.id || null,
          phone: user?.phone || phone || "",
          items: validatedItems.map(({ ref, ...rest }) => rest),
          total: total,
          paymentMethod: selectedPayment.type,
          isPaid: false,
          stockDeducted: true,
          status: "Pendiente",
          createdAt: serverTimestamp(),
          date: new Date().toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
        console.log("✅ [PASO 5] Orden escrita (pendiente commit)");
      });

      console.log("🟢 [CHECKOUT WA] ¡Transacción completada con éxito!");

      // 3. Abrir WhatsApp
      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
        "_blank",
      );

      toast.success("Procesando pedido... Validando pago");
      clearCart();
      window.dispatchEvent(new Event("cart-cleared"));
      setIsCartOpen(false);
      // PASAR ESTADO A THANK-YOU PARA EVITAR REDIRECCIÓN
      navigate("/thank-you", { state: { orderId: newOrderId, total, items: cart, paymentMethod: selectedPayment.type } });
    } catch (error) {
      console.error("🔴 [CHECKOUT WA] ERROR:", error);
      console.error("🔴 [CHECKOUT WA] Error code:", error?.code);
      console.error("🔴 [CHECKOUT WA] Error message:", error?.message);
      const errMsg = error?.message || error?.code || (typeof error === "string" ? error : "Error desconocido");
      toast.error(`Error: ${errMsg}`);
    }
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

      <div className="max-w-[1440px] mx-auto w-full">
        <Navbar cartCount={cartCount} onOpenCart={() => setIsCartOpen(true)} />
      </div>
      <main className="flex-grow w-full">
        <div className="max-w-[1440px] mx-auto">
          <Outlet context={{ addToCart }} />
        </div>
      </main>
      <Footer />

      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isCartOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={() => setIsCartOpen(false)}
      />

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${isCartOpen ? "translate-x-0" : "translate-x-full"
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
                    {item.variant && (
                      <span className="inline-block text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-1">
                        {item.variant}
                      </span>
                    )}
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
                          onClick={() => updateQty(item.cartKey || item.id, -1)}
                          className="p-1.5 hover:bg-gray-200 transition text-slate-600"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="px-3 text-xs font-bold text-slate-800 min-w-[24px] text-center">
                          {item.quantity || 1}
                        </span>
                        <button
                          onClick={() => updateQty(item.cartKey || item.id, 1)}
                          className="p-1.5 hover:bg-gray-200 transition text-slate-600"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.cartKey || item.id)}
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

                    if (!user) return null; // Solo requerimos usuario logueado

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

                  {/* OPCIÓN 3: PAGAR CON BOLD (Pasarela de pago) */}
                  <div
                    onClick={() => setSelectedPayment({ type: "Bold", id: "bold" })}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedPayment?.id === "bold"
                      ? "bg-indigo-50 border-indigo-500 ring-1"
                      : "bg-white border-slate-200"
                      }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <CreditCard size={16} className="text-indigo-600" />
                        <span className="font-bold text-sm text-slate-800">
                          Pagar con Bold
                        </span>
                      </div>
                      {selectedPayment?.id === "bold" && (
                        <Check size={16} className="text-indigo-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 ml-6">
                      Tarjeta de crédito/débito, PSE
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

            {/* Botón de acción principal */}
            {boldPendingOrder && selectedPayment?.id === "bold" ? (
              /* Cuando ya existe la orden, mostrar directamente el botón de Bold */
              <div className="w-full">
                <p className="text-xs text-center text-indigo-600 font-bold mb-2">
                  ✅ Pedido listo — dale clic al botón de pago para continuar:
                </p>
                <BoldPaymentButton
                  orderId={boldPendingOrder.orderId}
                  amount={boldPendingOrder.amount}
                  apiKey={boldPendingOrder.apiKey}
                  secretKey={boldPendingOrder.secretKey}
                  redirectUrl={boldPendingOrder.redirectUrl}
                  customerData={boldPendingOrder.customerData}
                />
              </div>
            ) : (
              <button
                onClick={() => {
                  if (!user) {
                    toast.info("Debes iniciar sesión para completar tu pedido");
                    setIsAuthOpen(true);
                    return;
                  }
                  handleCheckout();
                }}
                disabled={
                  selectedPayment?.type === "Billetera" &&
                  Number(user?.balance || 0) < total
                }
                className={`w-full text-white py-4 rounded-xl font-bold text-lg transition flex items-center justify-center gap-2 disabled:opacity-50 ${selectedPayment?.id === "bold" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-green-600 hover:bg-green-700"}`}
              >
                {user ? (
                  <>
                    {selectedPayment?.id === "bold" ? "Preparar Pago con Bold" : "Completar Pedido"}{" "}
                    <ArrowRight size={20} />
                  </>
                ) : (
                  <>Iniciar Sesión para Comprar <User size={20} /></>
                )}
              </button>
            )}
          </div>
        )}
      </div>
      <WhatsAppFloat hide={isCartOpen} />

      {/* MODAL DE LOGIN */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}
