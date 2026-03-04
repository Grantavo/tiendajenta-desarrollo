// src/hooks/useProducts.js
import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
// Nota: Ajustamos la ruta de importación porque estamos dentro de 'hooks'
import { db } from "../firebase/config";

export function useProducts() {
  // 1. Estado para guardar los datos
  const [products, setProducts] = useState([]);

  // 2. Estado para saber si está cargando (UX vital)
  const [loading, setLoading] = useState(true);

  // 3. Estado para errores (Manejo de fallos)
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);

    const productsRef = collection(db, "products");

    const unsubscribe = onSnapshot(
      productsRef,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProducts(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error obteniendo productos:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    // Cleanup: nos desuscribimos cuando el componente se desmonta
    return () => unsubscribe();
  }, []); // Array vacío = Se suscribe una vez al montar

  // Retornamos un objeto con todo lo que la vista necesita
  return { products, loading, error };
}
