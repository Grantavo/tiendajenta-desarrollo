import React, { useState, useEffect } from "react";
import {
  Truck,
  Save,
  DollarSign,
  Info,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

// FIREBASE
import { db } from "../../firebase/config";
// Usamos getDoc y setDoc para apuntar a una colección y documento específicos
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function Shipping() {
  const [shippingCost, setShippingCost] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Eliminamos docId porque ahora usaremos un ID fijo para estandarizar

  // 1. CARGAR CONFIGURACIÓN (DESDE LA NUEVA COLECCIÓN INDEPENDIENTE)
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        //
        // Buscamos en la colección raíz "shipping_config", documento "standard_rate"
        const docRef = doc(db, "shipping_config", "standard_rate");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const val = docSnap.data().cost; // Usamos la propiedad 'cost'
          setShippingCost(val ? val.toString() : "");
        } else {
          setShippingCost("");
        }
      } catch (error) {
        console.error("Error cargando envíos:", error);
        toast.error("Error al cargar la configuración");
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // --- HELPER PARA FORMATEAR ---
  const formatNumber = (val) => {
    if (!val) return "";
    return Number(val).toLocaleString("es-CO");
  };

  // --- MANEJO DEL CAMBIO EN EL INPUT ---
  const handleInputChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (rawValue === "0") {
      setShippingCost("");
      return;
    }
    setShippingCost(rawValue);
  };

  // 2. GUARDAR CAMBIOS (EN LA NUEVA COLECCIÓN)
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const priceNumber = shippingCost === "" ? 0 : Number(shippingCost);

      // Guardamos en la colección independiente
      const ref = doc(db, "shipping_config", "standard_rate");

      await setDoc(ref, {
        cost: priceNumber, // Guardamos el valor en el campo 'cost'
        updatedAt: new Date(),
      });

      toast.success("Costo de envío actualizado en la nueva colección");

      // Avisamos a las otras pestañas
      window.localStorage.setItem("shopSettingsUpdate", Date.now());
      window.dispatchEvent(new Event("storage"));
    } catch (error) {
      console.error("Error guardando:", error);
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Truck className="text-blue-600" /> Configuración de Envíos
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Define cuánto cobrarás por el domicilio en el carrito de compras.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PANEL DE EDICIÓN */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            <DollarSign size={18} /> Tarifa Estándar
          </h2>

          <form onSubmit={handleSave}>
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                Valor ($COP)
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700 text-lg placeholder:text-slate-300 placeholder:font-normal"
                  placeholder="Ej: 5.000"
                  value={formatNumber(shippingCost)}
                  onChange={handleInputChange}
                />
              </div>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <Info size={12} />
                Déjalo vacío o en 0 para envío <strong>Gratis</strong>.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              {saving ? "Guardando..." : "Guardar Tarifa"}
              {!saving && <Save size={18} />}
            </button>
          </form>
        </div>

        {/* VISTA PREVIA */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-4">
            Así lo verá el cliente
          </h3>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 w-full max-w-xs">
            <div className="flex justify-between text-sm items-center py-2 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-1">
                <Truck size={14} /> Envío
              </span>
              <span
                className={`font-bold ${
                  !shippingCost || Number(shippingCost) === 0
                    ? "text-green-600"
                    : "text-slate-700"
                }`}
              >
                {!shippingCost || Number(shippingCost) === 0
                  ? "Gratis"
                  : `$${Number(shippingCost).toLocaleString("es-CO")}`}
              </span>
            </div>
          </div>

          <div className="mt-4">
            {!shippingCost || Number(shippingCost) === 0 ? (
              <span className="text-xs font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full">
                <CheckCircle2 size={12} className="inline mr-1" /> Envío Gratis
                activado
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-500 bg-slate-200 px-3 py-1 rounded-full">
                <AlertCircle size={12} className="inline mr-1" /> Tarifa fija
                activa
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
