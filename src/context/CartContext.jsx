/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { toast } from "sonner";

// FIREBASE
import { db, auth } from "../firebase/config";
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, signOut, getRedirectResult } from "firebase/auth";
import useIdleTimer from "../hooks/useIdleTimer";

const CartContext = createContext();

export function CartProvider({ children }) {
  // 1. FUNCIÓN PARA LEER USUARIO (Reutilizable)
  const getUserFromStorage = () => {
    try {
      const session =
        sessionStorage.getItem("shopUser") || localStorage.getItem("shopUser");
      if (session) {
        const u = JSON.parse(session);
        return u?.email ? { ...u, email: u.email.toLowerCase().trim() } : null;
      }
    } catch (error) {
      console.error(error);
    }
    return null;
  };

  const [user, setUser] = useState(getUserFromStorage);

  // 2. ESTADO DEL CARRITO
  const [cart, setCart] = useState(() => {
    try {
      const local = localStorage.getItem("jenta_cart");
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  });

  // --- ESCUCHADOR DE EVENTOS DE LOGIN/LOGOUT ---
  useEffect(() => {
    const handleAuthChange = () => setUser(getUserFromStorage());
    window.addEventListener("auth-change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    return () => {
      window.removeEventListener("auth-change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  // --- ESCUCHADOR PARA VACIAR EL CARRITO TRAS EL PAGO ---
  useEffect(() => {
    const handleCartCleared = () => {
      setCart([]);
      localStorage.removeItem("jenta_cart");
    };
    window.addEventListener("cart-cleared", handleCartCleared);
    return () => window.removeEventListener("cart-cleared", handleCartCleared);
  }, []);

  // --- TIMEOUT DE INACTIVIDAD DEL CLIENTE (12 HORAS) ---
  const CLIENT_IDLE_TIMEOUT = 1000 * 60 * 60 * 12; // 12 horas
  useIdleTimer({
    timeout: CLIENT_IDLE_TIMEOUT,
    onIdle: () => {
      if (user) {
        toast.info("Tu sesión ha expirado por inactividad. Por favor inicia sesión nuevamente.", { duration: 6000 });
        // Limpiar sesión
        sessionStorage.removeItem("shopUser");
        localStorage.removeItem("shopUser");
        setCart([]);
        localStorage.removeItem("jenta_cart");
        setUser(null);
        signOut(auth).catch(() => {});
        window.dispatchEvent(new Event("auth-change"));
        window.location.href = "/";
      }
    },
  });

  // --- FIREBASE AUTH LISTENER: Detecta login con Google (redirect o popup) ---
  useEffect(() => {
    // 1. Manejar el resultado de la redirección de Google (OBLIGATORIO PARA MÓVILES)
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          console.log("Sesión Google completada");
        }
      } catch (error) {
        console.error("Error al procesar login Google:", error);
        toast.error(`Error con Google: ${error.message}`);
      }
    };

    handleRedirect();

    // 2. Escuchar cambios de estado (Se disparará después de getRedirectResult)
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) return; // No hay usuario autenticado

      // Si ya tenemos sesión activa con este mismo email, no hacer nada
      const currentSession = getUserFromStorage();
      if (currentSession?.email?.toLowerCase() === firebaseUser.email?.toLowerCase()) return;



      try {
        // Verificar si ya existe en users (admin) o clients
        let userData = null;
        let collectionName = "users";
        let isNew = false;

        let docRef = doc(db, "users", firebaseUser.uid);
        let docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          docRef = doc(db, "clients", firebaseUser.uid);
          docSnap = await getDoc(docRef);
          collectionName = "clients";
        }

        if (docSnap.exists()) {
          userData = { id: firebaseUser.uid, ...docSnap.data(), collection: collectionName };
        } else {
          // Usuario NUEVO — crear perfil en clients
          isNew = true;
          const newClient = {
            name: firebaseUser.displayName || "Cliente Google",
            email: firebaseUser.email,
            phone: "",
            role: "client",
            balance: 0,
            points: 0,
            createdAt: serverTimestamp(),
          };
          await setDoc(doc(db, "clients", firebaseUser.uid), newClient);
          collectionName = "clients";
          userData = {
            id: firebaseUser.uid,
            ...newClient,
            collection: "clients",
            createdAt: new Date().toISOString(),
          };
        }

        // Guardar sesión y actualizar estado (sin campos financieros)
        const { balance, points, walletBalance, loyaltyPoints, investmentBalance, lastInvestmentUpdate, ...safeData } = userData;
        sessionStorage.setItem("shopUser", JSON.stringify(safeData));
        setUser(userData);
        window.dispatchEvent(new Event("auth-change")); // Avisar a la Navbar y la app

        toast.success(`¡Bienvenido, ${userData.name || firebaseUser.displayName}!`);

        // Opcional: Si es nuevo redirigir al perfil (comentado porque navigate no está disponible en context fácilmente)
        // if (isNew) window.location.href = "/perfil"; 

      } catch (error) {
        console.error("Error procesando usuario:", error);
      }
    });

    return () => unsubAuth();
  }, []);

  // 3. SINCRONIZACIÓN USER DATA (Firebase)
  useEffect(() => {
    if (!user?.email) return;
    const cleanEmail = user.email.toLowerCase().trim();

    const collectionName = user.collection || "clients";
    const docId = user.id;
    if (!docId) return;

    const unsubClient = onSnapshot(
      doc(db, collectionName, docId),
      (docSnap) => {
        if (docSnap.exists()) {
          const cloudData = docSnap.data();
          setUser((prev) => {
            if (prev?.balance === cloudData.balance) return prev;
            return { ...prev, ...cloudData, email: cleanEmail };
          });
        }
      },
      (error) => console.error("Error cliente:", error),
    );
    return () => unsubClient();
  }, [user?.email]);

  // 4. SINCRONIZACIÓN CARRITO (Nube <-> Local)
  // SEGURIDAD: Usar user.id (UID) como ID del carrito para que coincida con las reglas de Firestore
  useEffect(() => {
    if (!user?.id) return;

    const unsubCart = onSnapshot(doc(db, "carts", user.id), (docSnap) => {
      if (docSnap.exists()) {
        const cloudItems = docSnap.data().items || [];
        setCart((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(cloudItems)) return prev;
          return cloudItems;
        });
      } else {
        // Crear carrito vacío en nube si es usuario nuevo
        setDoc(doc(db, "carts", user.id), { items: [] }, { merge: true });
      }
    });
    return () => unsubCart();
  }, [user?.id]);

  // 5. BACKUP LOCAL
  useEffect(() => {
    localStorage.setItem("jenta_cart", JSON.stringify(cart));
  }, [cart]);

  // 6. ACCIONES
  const addToCart = useCallback(
    async (product, quantityToAdd, variant = null) => {
      const amount = Math.max(1, Number(quantityToAdd) || 1);
      const stockLimit = Number(product.stock) || 0;
      const uid = user?.id;
      // Si hay variante, usamos una clave compuesta para diferenciar el mismo producto en distintas variantes
      const cartKey = variant ? `${product.id}_${variant}` : product.id;

      setCart((prev) => {
        const idx = prev.findIndex((item) => item.cartKey === cartKey);
        let newCart = [...prev];

        if (idx >= 0) {
          const newQty = prev[idx].quantity + amount;
          if (newQty > stockLimit) {
            toast.error(`Stock máximo: ${stockLimit}`);
            return prev;
          }
          newCart[idx] = { ...newCart[idx], quantity: newQty };
        } else {
          if (amount > stockLimit) {
            toast.error(`Stock máximo: ${stockLimit}`);
            return prev;
          }
          newCart.push({
            cartKey,
            id: product.id,
            title: product.title,
            price: Number(product.price),
            image: Array.isArray(product.images)
              ? product.images[0]
              : product.image,
            quantity: amount,
            stock: stockLimit,
            ...(variant && { variant }),
          });
        }

        if (uid) {
          setDoc(
            doc(db, "carts", uid),
            { items: newCart },
            { merge: true },
          ).catch((e) => console.error("Error sync cart:", e));
        }
        toast.success(variant ? `"${variant}" agregado al carrito` : "Agregado al carrito");
        return newCart;
      });
    },
    [user?.id],
  );

  const removeFromCart = useCallback(
    async (key) => {
      const uid = user?.id;
      setCart((prev) => {
        // Busca por cartKey primero (nuevo), luego por id (retrocompatibilidad)
        const newCart = prev.filter((i) => (i.cartKey || i.id) !== key);
        if (uid)
          setDoc(doc(db, "carts", uid), { items: newCart }, { merge: true });
        return newCart;
      });
      toast.success("Eliminado");
    },
    [user?.id],
  );

  const clearCart = useCallback(async () => {
    const uid = user?.id;
    setCart([]);
    localStorage.removeItem("jenta_cart");
    if (uid)
      await setDoc(doc(db, "carts", uid), { items: [] }, { merge: true });
  }, [user?.id]);

  const logout = useCallback(async () => {
    sessionStorage.removeItem("shopUser");
    localStorage.removeItem("shopUser");
    setCart([]); // Limpiar carrito visualmente
    setUser(null);
    // CERRAR SESIÓN DE FIREBASE AUTH (evita usuarios fantasma)
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Error cerrando Firebase Auth:", e);
    }
    window.dispatchEvent(new Event("auth-change")); // Avisar a toda la app
    // Forzamos la recarga de la página actual para limpiar estados de memoria RAM en React
    window.location.href = window.location.pathname;
  }, []);

  const cartCount = useMemo(
    () => cart.reduce((acc, i) => acc + i.quantity, 0),
    [cart],
  );
  const isSyncing = useMemo(
    () => user?.email && user.balance === undefined,
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      cart,
      addToCart,
      removeFromCart,
      clearCart,
      logout, // Exportamos logout
      cartCount,
      isSyncing,
    }),
    [
      user,
      cart,
      addToCart,
      removeFromCart,
      clearCart,
      logout,
      cartCount,
      isSyncing,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart error");
  return context;
};
