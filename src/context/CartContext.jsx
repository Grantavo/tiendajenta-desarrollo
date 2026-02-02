/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { toast } from "sonner";

// FIREBASE
import { db } from "../firebase/config";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

const CartContext = createContext();

export function CartProvider({ children }) {
  // 1. INICIALIZACIÓN LAZY: Carga inmediata sin disparar efectos
  const [user, setUser] = useState(() => {
    try {
      const session =
        sessionStorage.getItem("shopUser") || localStorage.getItem("shopUser");
      if (session) {
        const u = JSON.parse(session);
        return u?.email ? { ...u, email: u.email.toLowerCase().trim() } : null;
      }
    } catch {
      return null;
    }
    return null;
  });

  const [cart, setCart] = useState(() => {
    try {
      const local = localStorage.getItem("jenta_cart");
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  });

  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  // --- 2. SUSCRIPCIÓN AL SALDO (COLECCIÓN CLIENTS) ---
  useEffect(() => {
    const email = user?.email;
    if (!email) return; // Si no hay email, no hacemos nada. No hay setStates aquí.

    const cleanEmail = email.toLowerCase().trim();
    const unsubClient = onSnapshot(
      doc(db, "clients", cleanEmail),
      (docSnap) => {
        if (docSnap.exists()) {
          const cloudData = docSnap.data();
          // Solo actualizamos si los datos son diferentes para evitar loops
          setUser((prev) => {
            if (prev?.balance === cloudData.balance) return prev;
            return { ...prev, ...cloudData, email: cleanEmail };
          });
        }
      },
      (error) => {
        console.error("Error balance:", error);
      },
    );

    return () => unsubClient();
  }, [user?.email]);

  // --- 3. SUSCRIPCIÓN AL CARRITO EN NUBE ---
  useEffect(() => {
    const email = user?.email;
    if (!email) return;

    const unsubCart = onSnapshot(doc(db, "carts", email), (docSnap) => {
      if (docSnap.exists()) {
        const cloudItems = docSnap.data().items || [];
        if (JSON.stringify(cloudItems) !== JSON.stringify(cartRef.current)) {
          setCart(cloudItems);
        }
      }
    });

    return () => unsubCart();
  }, [user?.email]);

  // --- 4. DERIVACIÓN DE ESTADO PURA ---
  // isSyncing es true SOLO si hay un email pero aún no hemos recibido el balance de Firebase
  const isSyncing = useMemo(() => {
    if (!user?.email) return false;
    return user.balance === undefined;
  }, [user]);

  // --- 5. BACKUP LOCAL ---
  useEffect(() => {
    localStorage.setItem("jenta_cart", JSON.stringify(cart));
  }, [cart]);

  // --- 6. ACCIONES DEL CARRITO ---
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
            toast.error(`Solo quedan ${stockLimit} unidades.`);
            return prev;
          }
          newCart[idx] = { ...newCart[idx], quantity: newQty };
        } else {
          if (amount > stockLimit) {
            toast.error(`Solo quedan ${stockLimit} unidades.`);
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
          setDoc(doc(db, "carts", email), { items: newCart }, { merge: true });
        }
        toast.success("Carrito actualizado");
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
      toast.success("Producto eliminado");
    },
    [user?.email],
  );

  const clearCart = useCallback(async () => {
    const email = user?.email;
    setCart([]);
    if (email) setDoc(doc(db, "carts", email), { items: [] });
  }, [user?.email]);

  const cartCount = useMemo(
    () => cart.reduce((acc, i) => acc + i.quantity, 0),
    [cart],
  );

  const value = useMemo(
    () => ({
      user,
      cart,
      addToCart,
      removeFromCart,
      clearCart,
      cartCount,
      isSyncing,
    }),
    [user, cart, addToCart, removeFromCart, clearCart, cartCount, isSyncing],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart context error");
  return context;
};
