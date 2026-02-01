// src/hooks/useProducts.js
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
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
    // Definimos la función asíncrona dentro del efecto
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const productsRef = collection(db, "products");
        const snapshot = await getDocs(productsRef);

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProducts(data);
      } catch (err) {
        console.error("Error obteniendo productos:", err);
        setError(err.message);
      } finally {
        // El 'finally' se ejecuta SIEMPRE, haya error o éxito
        setLoading(false);
      }
    };

    fetchProducts();
  }, []); // Array vacío = Solo se ejecuta al montar el componente (una vez)

  // Retornamos un objeto con todo lo que la vista necesita
  return { products, loading, error };
}
