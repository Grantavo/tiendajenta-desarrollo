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
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [isSyncing, setIsSyncing] = useState(true);

  // --- 1. DETECCIÓN SEGURA DE USUARIO ---
  useEffect(() => {
    const checkUser = () => {
      try {
        const session =
          sessionStorage.getItem("shopUser") ||
          localStorage.getItem("shopUser");

        if (session) {
          const u = JSON.parse(session);
          if (u && typeof u === "object" && u.email) {
            u.email = u.email.toLowerCase().trim();
            setUser(u);
            return;
          }
        }
        setUser(null);
      } catch (e) {
        console.error("Error leyendo sesión:", e);
        setUser(null);
      }
    };

    checkUser();
    window.addEventListener("storage", checkUser);
    return () => window.removeEventListener("storage", checkUser);
  }, []);

  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  // --- 2. CONEXIÓN BLINDADA A LA NUBE ---
  useEffect(() => {
    let unsub;

    const connectToCloud = async () => {
      if (!user || !user.email) {
        const local = localStorage.getItem("jenta_cart");
        if (local) {
          try {
            setCart(JSON.parse(local));
          } catch {
            setCart([]);
          }
        }
        setIsSyncing(false);
        return;
      }

      try {
        const docRef = doc(db, "carts", user.email);

        unsub = onSnapshot(
          docRef,
          (docSnap) => {
            setIsSyncing(false);
            if (docSnap.exists()) {
              const cloudItems = docSnap.data().items || [];
              if (
                JSON.stringify(cloudItems) !== JSON.stringify(cartRef.current)
              ) {
                setCart(cloudItems);
              }
            }
          },
          (error) => {
            console.error("Error sincronizando carrito (Snapshot):", error);
            setIsSyncing(false);
          },
        );
      } catch (error) {
        console.error("Error crítico conectando carrito:", error);
        setIsSyncing(false);
      }
    };

    connectToCloud();
    return () => {
      if (unsub) unsub();
    };
  }, [user]);

  // --- 3. BACKUP LOCAL ---
  useEffect(() => {
    localStorage.setItem("jenta_cart", JSON.stringify(cart));
  }, [cart]);

  // --- 4. FUNCIÓN AGREGAR (REFACTORIZADA) ---
  const addToCart = useCallback(
    async (rawProduct) => {
      try {
        const productToAdd = {
          id: rawProduct.id,
          title: rawProduct.title || "Producto",
          price: Number(rawProduct.price) || 0,
          image:
            Array.isArray(rawProduct.images) && rawProduct.images.length > 0
              ? rawProduct.images[0]
              : rawProduct.image || null,
          quantity: Number(rawProduct.quantity) || 1, // Captura la cantidad dinámica
          stock: Number(rawProduct.stock) || 0,
        };

        setCart((prevCart) => {
          const existingIndex = prevCart.findIndex(
            (item) => item.id === productToAdd.id,
          );
          let newCart = [...prevCart];

          if (existingIndex >= 0) {
            const newQuantity =
              newCart[existingIndex].quantity + productToAdd.quantity;

            if (newQuantity > productToAdd.stock) {
              toast.error(
                `Solo quedan ${productToAdd.stock} unidades disponibles.`,
              );
              return prevCart;
            }

            newCart[existingIndex] = {
              ...newCart[existingIndex],
              quantity: newQuantity,
            };
          } else {
            if (productToAdd.quantity > productToAdd.stock) {
              toast.error(
                `Solo quedan ${productToAdd.stock} unidades disponibles.`,
              );
              return prevCart;
            }
            newCart.push(productToAdd);
          }

          // Sincronización Firebase
          if (user?.email) {
            const docRef = doc(db, "carts", user.email);
            setDoc(docRef, { items: newCart }, { merge: true }).catch((e) =>
              console.error("Error guardando carrito:", e),
            );
          }

          toast.success("Producto agregado al carrito");
          return newCart;
        });
      } catch (error) {
        console.error("Error en addToCart:", error);
        toast.error("No se pudo agregar al carrito");
      }
    },
    [user],
  );

  // --- 5. FUNCIÓN ELIMINAR ---
  const removeFromCart = useCallback(
    async (id) => {
      const newCart = cart.filter((item) => item.id !== id);
      setCart(newCart);
      toast.success("Producto eliminado");

      if (user?.email) {
        try {
          const docRef = doc(db, "carts", user.email);
          await setDoc(docRef, { items: newCart }, { merge: true });
        } catch (error) {
          console.error("Error eliminando nube:", error);
        }
      }
    },
    [cart, user],
  );

  // --- 6. FUNCIÓN LIMPIAR ---
  const clearCart = useCallback(async () => {
    setCart([]);
    if (user?.email) {
      try {
        const docRef = doc(db, "carts", user.email);
        await setDoc(docRef, { items: [] });
      } catch (error) {
        console.error("Error limpiando nube:", error);
      }
    }
  }, [user]);

  const cartCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart],
  );

  const value = useMemo(
    () => ({
      cart,
      addToCart,
      removeFromCart,
      clearCart,
      cartCount,
      isSyncing,
    }),
    [cart, addToCart, removeFromCart, clearCart, cartCount, isSyncing],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de CartProvider");
  return context;
};
