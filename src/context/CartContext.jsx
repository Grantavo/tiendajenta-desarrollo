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

  // --- 1. DETECCIÓN DE USUARIO ---
  useEffect(() => {
    const checkUser = () => {
      try {
        const session =
          sessionStorage.getItem("shopUser") ||
          localStorage.getItem("shopUser");
        if (session) {
          const u = JSON.parse(session);
          if (u.email) {
            u.email = u.email.toLowerCase().trim();
            setUser(u);
            return;
          }
        }
        setUser(null);
      } catch {
        setUser(null);
      }
    };
    checkUser();
    window.addEventListener("storage", checkUser);
    return () => window.removeEventListener("storage", checkUser);
  }, []);

  // Referencia espejo para evitar ciclos infinitos en useEffect
  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  // --- 2. CONEXIÓN A LA NUBE (FIREBASE) ---
  useEffect(() => {
    let unsub;
    const connectToCloud = async () => {
      if (!user?.email) {
        // Modo invitado: Cargar de LocalStorage
        const local = localStorage.getItem("jenta_cart");
        if (local) {
          try {
            setCart(JSON.parse(local));
          } catch (e) {
            console.error("Error parsing local cart", e);
            setCart([]);
          }
        }
        setIsSyncing(false);
        return;
      }

      // Modo Usuario: Escuchar Firebase en tiempo real
      const docRef = doc(db, "carts", user.email);

      unsub = onSnapshot(
        docRef,
        (docSnap) => {
          setIsSyncing(false);
          if (docSnap.exists()) {
            const cloudItems = docSnap.data().items || [];
            // Solo actualizamos si hay diferencias reales para evitar re-renders
            if (
              JSON.stringify(cloudItems) !== JSON.stringify(cartRef.current)
            ) {
              setCart(cloudItems);
            }
          } else {
            // Si no existe carrito en nube pero sí localmente (recién logueado), se podría subir el local.
            // Por simplicidad, aquí iniciamos vacío si no hay en nube.
            if (cartRef.current.length > 0) {
              // Opcional: Podrías fusionar aquí en lugar de limpiar
              setCart([]);
            }
          }
        },
        (error) => {
          console.error("Error sync:", error);
          setIsSyncing(false);
        },
      );
    };

    connectToCloud();
    return () => {
      if (unsub) unsub();
    };
  }, [user]); // Dependencia: usuario

  // --- 3. BACKUP LOCAL (Para persistencia al recargar) ---
  useEffect(() => {
    localStorage.setItem("jenta_cart", JSON.stringify(cart));
  }, [cart]);

  // --- 4. FUNCIÓN AGREGAR (CON VALIDACIÓN DE STOCK) ---
  const addToCart = useCallback(
    async (rawProduct) => {
      // 1. Limpieza y preparación de datos del producto
      const cleanProduct = {
        id: rawProduct.id,
        title: rawProduct.title || "Producto",
        price: Number(rawProduct.price) || 0,
        // Manejo robusto de imagen
        image:
          Array.isArray(rawProduct.images) && rawProduct.images.length > 0
            ? rawProduct.images[0]
            : rawProduct.image || null,
        quantity: Number(rawProduct.quantity) || 1,
        stock: Number(rawProduct.stock) || 0, // Aseguramos leer el stock
      };

      // 2. Copia del carrito actual para no mutar estado directamente
      let newCart = [...cart];

      // 3. Buscar si el producto ya existe en el carrito
      const existingIndex = newCart.findIndex(
        (item) => item.id === cleanProduct.id,
      );

      // --- VALIDACIÓN DE STOCK ---
      let currentQtyInCart = 0;
      if (existingIndex >= 0) {
        currentQtyInCart = newCart[existingIndex].quantity;
      }

      const totalRequested = currentQtyInCart + cleanProduct.quantity;

      // Si lo solicitado supera el stock disponible
      if (totalRequested > cleanProduct.stock) {
        toast.error(
          `¡Stock insuficiente! Solo quedan ${cleanProduct.stock} unidades.`,
        );
        return; // DETIENE LA EJECUCIÓN AQUÍ
      }
      // ---------------------------

      // 4. Actualizar o Agregar
      if (existingIndex >= 0) {
        // Si existe, actualizamos la cantidad
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: totalRequested, // Usamos el total calculado validado
          stock: cleanProduct.stock, // Actualizamos info de stock por si cambió
        };
      } else {
        // Si no existe, lo agregamos
        newCart.push(cleanProduct);
      }

      // 5. Guardar estado y notificar
      setCart(newCart);
      toast.success("Producto agregado al carrito");

      // 6. Sincronizar con Firebase si hay usuario
      if (user?.email) {
        try {
          const docRef = doc(db, "carts", user.email);
          await setDoc(docRef, { items: newCart }, { merge: true });
        } catch (error) {
          console.error("Error guardando en nube:", error);
          toast.error("Error guardando en tu cuenta");
        }
      }
    },
    [cart, user],
  );

  // --- 5. FUNCIÓN ELIMINAR ---
  const removeFromCart = useCallback(
    async (id) => {
      // 1. Eliminación visual inmediata (Optimista)
      const newCart = cart.filter((item) => item.id !== id);
      setCart(newCart);
      toast.success("Producto eliminado");

      // 2. Actualizar Nube
      if (user?.email) {
        try {
          const docRef = doc(db, "carts", user.email);
          await setDoc(docRef, { items: newCart }, { merge: true });
        } catch (error) {
          console.error("Error eliminando en nube:", error);
        }
      }
    },
    [cart, user],
  );

  // --- 6. FUNCIÓN LIMPIAR CARRITO (Para después de comprar) ---
  const clearCart = useCallback(async () => {
    setCart([]);
    if (user?.email) {
      try {
        const docRef = doc(db, "carts", user.email);
        await setDoc(docRef, { items: [] });
      } catch (error) {
        console.error("Error limpiando carrito nube:", error);
      }
    }
  }, [user]);

  // Calculamos el total de items para el badge del icono
  const cartCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart],
  );

  // Exportamos todo
  const value = useMemo(
    () => ({
      cart,
      addToCart,
      removeFromCart,
      clearCart, // Agregado por si lo necesitas en el checkout
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
