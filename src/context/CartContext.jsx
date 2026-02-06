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
import { db } from "../firebase/config";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

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

  // --- NUEVO: ESCUCHADOR DE EVENTOS DE LOGIN/LOGOUT ---
  useEffect(() => {
    // Función que recarga el usuario
    const handleAuthChange = () => setUser(getUserFromStorage());

    // Escuchamos el evento personalizado 'auth-change' (Mismo Tab)
    window.addEventListener("auth-change", handleAuthChange);
    // Escuchamos el evento 'storage' (Entre Tabs/Ventanas)
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener("auth-change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
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
  useEffect(() => {
    if (!user?.email) return;

    const unsubCart = onSnapshot(doc(db, "carts", user.email), (docSnap) => {
      if (docSnap.exists()) {
        const cloudItems = docSnap.data().items || [];
        setCart((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(cloudItems)) return prev;
          return cloudItems;
        });
      } else {
        // Crear carrito vacío en nube si es usuario nuevo
        setDoc(doc(db, "carts", user.email), { items: [] }, { merge: true });
      }
    });
    return () => unsubCart();
  }, [user?.email]);

  // 5. BACKUP LOCAL
  useEffect(() => {
    localStorage.setItem("jenta_cart", JSON.stringify(cart));
  }, [cart]);

  // 6. ACCIONES
  const addToCart = useCallback(
    async (product, quantityToAdd) => {
      const amount = Math.max(1, Number(quantityToAdd) || 1);
      const stockLimit = Number(product.stock) || 0;
      const email = user?.email;

      setCart((prev) => {
        const idx = prev.findIndex((item) => item.id === product.id);
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
            id: product.id,
            title: product.title,
            price: Number(product.price),
            image: Array.isArray(product.images)
              ? product.images[0]
              : product.image,
            quantity: amount,
            stock: stockLimit,
          });
        }

        if (email) {
          setDoc(
            doc(db, "carts", email),
            { items: newCart },
            { merge: true },
          ).catch((e) => console.error("Error sync cart:", e));
        }
        toast.success("Agregado al carrito");
        return newCart;
      });
    },
    [user?.email],
  );

  const removeFromCart = useCallback(
    async (id) => {
      const email = user?.email;
      setCart((prev) => {
        const newCart = prev.filter((i) => i.id !== id);
        if (email)
          setDoc(doc(db, "carts", email), { items: newCart }, { merge: true });
        return newCart;
      });
      toast.success("Eliminado");
    },
    [user?.email],
  );

  const clearCart = useCallback(async () => {
    const email = user?.email;
    setCart([]);
    if (email)
      await setDoc(doc(db, "carts", email), { items: [] }, { merge: true });
  }, [user?.email]);

  const logout = useCallback(() => {
    sessionStorage.removeItem("shopUser");
    localStorage.removeItem("shopUser");
    setCart([]); // Limpiar carrito visualmente
    setUser(null);
    window.dispatchEvent(new Event("auth-change")); // Avisar a toda la app
    toast.info("Sesión cerrada");
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
