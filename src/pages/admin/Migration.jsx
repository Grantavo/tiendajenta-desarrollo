import React, { useState } from "react";
import { db } from "../../firebase/config";
import { doc, writeBatch } from "firebase/firestore"; // <--- Importaciones limpias
import { UploadCloud, CheckCircle, AlertTriangle } from "lucide-react";

export default function Migration() {
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [log, setLog] = useState([]);

  const addLog = (msg) => setLog((prev) => [...prev, msg]);

  const handleMigration = async () => {
    if (
      !window.confirm(
        "¿Estás seguro de subir tus datos a la nube? Esto podría sobrescribir datos existentes."
      )
    )
      return;

    setStatus("loading");
    setLog([]);
    addLog("🚀 Iniciando migración...");

    try {
      // Usamos batch para hacer muchas escrituras en una sola petición (más eficiente)
      const batch = writeBatch(db);
      let count = 0;

      // 1. MIGRAR CATEGORÍAS
      const localCats = JSON.parse(
        localStorage.getItem("shopCategories") || "[]"
      );
      addLog(`📂 Encontradas ${localCats.length} categorías locales.`);

      localCats.forEach((cat) => {
        // Usamos el ID como nombre del documento para mantener la referencia
        const ref = doc(db, "categories", cat.id.toString());
        batch.set(ref, cat);
        count++;
      });

      // 2. MIGRAR PRODUCTOS
      const localProds = JSON.parse(
        localStorage.getItem("shopProducts") || "[]"
      );
      addLog(`📦 Encontrados ${localProds.length} productos locales.`);

      localProds.forEach((prod) => {
        const ref = doc(db, "products", prod.id.toString());
        batch.set(ref, prod);
        count++;
      });

      // 3. EJECUTAR EL LOTE
      if (count > 0) {
        await batch.commit();
        addLog("✅ ¡Datos subidos exitosamente a Firebase!");
        setStatus("success");
      } else {
        addLog("⚠️ No había datos para migrar.");
        setStatus("idle");
      }
    } catch (error) {
      console.error(error);
      addLog(`❌ Error crítico: ${error.message}`);
      setStatus("error");
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100 text-center">
        <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <UploadCloud size={40} className="text-blue-600" />
        </div>

        <h1 className="text-2xl font-black text-slate-800 mb-2">
          Migración a la Nube
        </h1>
        <p className="text-slate-500 mb-8">
          Este proceso tomará tus productos y categorías actuales del navegador
          y los guardará en la base de datos de Google.
        </p>

        {status === "success" ? (
          <div className="bg-green-100 text-green-700 p-4 rounded-xl flex items-center justify-center gap-2 font-bold mb-6">
            <CheckCircle /> ¡Migración Completada!
          </div>
        ) : (
          <button
            onClick={handleMigration}
            disabled={status === "loading"}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
          >
            {status === "loading"
              ? "Subiendo datos..."
              : "Subir Datos a Firebase"}
          </button>
        )}

        {/* LOGS DE LA CONSOLA */}
        <div className="mt-8 text-left bg-slate-900 rounded-xl p-4 font-mono text-xs text-green-400 h-64 overflow-y-auto shadow-inner">
          <p className="opacity-50 border-b border-slate-700 pb-2 mb-2">
            Logs del sistema...
          </p>
          {log.map((l, i) => (
            <p key={i} className="mb-1">
              {l}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
