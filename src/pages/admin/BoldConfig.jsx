import React, { useState, useEffect } from "react";
import { CreditCard, Save, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "../../firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function BoldConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  
  const [config, setConfig] = useState({
    sandboxApiKey: "",
    sandboxSecretKey: "",
    productionApiKey: "",
    productionSecretKey: "",
    mode: "sandbox",
    enabled: false
  });

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "settings", "bold");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          // Asegurar que existan todos los campos para evitar warnings de React
          const data = docSnap.data();
          setConfig({
            sandboxApiKey: data.sandboxApiKey || "",
            sandboxSecretKey: data.sandboxSecretKey || "",
            productionApiKey: data.productionApiKey || "",
            productionSecretKey: data.productionSecretKey || "",
            mode: data.mode || "sandbox",
            enabled: !!data.enabled
          });
        }
      } catch (error) {
        console.error("Error cargando configuración:", error);
        toast.error("Error al cargar la configuración de Bold");
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const docRef = doc(db, "settings", "bold");
      await setDoc(docRef, {
        ...config,
        updatedAt: new Date()
      });
      
      toast.success("Configuración de Bold guardada correctamente");
    } catch (error) {
      console.error("Error guardando configuración:", error);
      toast.error("Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-400">
        Cargando configuración de Bold...
      </div>
    );
  }

  const isSandbox = config.mode === "sandbox";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <CreditCard className="text-indigo-600" size={32} />
          <h1 className="text-2xl font-bold text-slate-800">Configuración de Bold</h1>
        </div>
        <p className="text-sm text-slate-500">
          Configura tu pasarela de pago Bold para aceptar tarjetas de crédito/débito y PSE.
        </p>
      </div>

      <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
        config.enabled 
          ? "bg-green-50 border-green-200" 
          : "bg-yellow-50 border-yellow-200"
      }`}>
        {config.enabled ? (
          <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={20} />
        ) : (
          <AlertCircle className="text-yellow-600 shrink-0 mt-0.5" size={20} />
        )}
        <div>
          <p className={`font-bold text-sm ${
            config.enabled ? "text-green-800" : "text-yellow-800"
          }`}>
            {config.enabled ? "Bold está activo en la tienda" : "Bold está desactivado en la tienda"}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            {config.enabled 
              ? "Los clientes pueden pagar con tarjeta y PSE en el checkout." 
              : "La opción de pagar con Bold estará oculta en el checkout hasta que lo actives."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Modo de Operación</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setConfig({ ...config, mode: "sandbox" })}
              className={`p-4 rounded-xl border-2 transition-all ${
                isSandbox
                  ? "border-orange-500 bg-orange-50 shadow-sm shadow-orange-500/20"
                  : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/50"
              }`}
            >
              <p className={`font-bold ${isSandbox ? "text-orange-800" : "text-slate-700"}`}>
                🧪 Sandbox (Pruebas)
              </p>
              <p className={`text-xs mt-1 ${isSandbox ? "text-orange-600" : "text-slate-500"}`}>
                Simular pagos sin dinero real
              </p>
            </button>

            <button
              type="button"
              onClick={() => setConfig({ ...config, mode: "production" })}
              className={`p-4 rounded-xl border-2 transition-all ${
                !isSandbox
                  ? "border-blue-500 bg-blue-50 shadow-sm shadow-blue-500/20"
                  : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50"
              }`}
            >
              <p className={`font-bold ${!isSandbox ? "text-blue-800" : "text-slate-700"}`}>
                🚀 Producción
              </p>
              <p className={`text-xs mt-1 ${!isSandbox ? "text-blue-600" : "text-slate-500"}`}>
                Recibir pagos y dinero real
              </p>
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              Llaves API de Bold 
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                isSandbox 
                  ? "bg-orange-100 text-orange-700" 
                  : "bg-blue-100 text-blue-700"
              }`}>
                {isSandbox ? "ENTORNO PRUEBAS" : "ENTORNO PRODUCCIÓN"}
              </span>
            </h3>
          </div>
          
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              {isSandbox ? "API Key de Pruebas (Público)" : "API Key de Producción (Público)"}
            </label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                // Vinculación dinámica: si es sandbox lee/escribe a sandboxApiKey, si no a productionApiKey
                value={isSandbox ? config.sandboxApiKey : config.productionApiKey}
                onChange={(e) => setConfig({ 
                  ...config, 
                  [isSandbox ? "sandboxApiKey" : "productionApiKey"]: e.target.value 
                })}
                placeholder={isSandbox ? "pk_test_xxxxxxxxxxxxxxxxxx" : "pk_live_xxxxxxxxxxxxxxxxxx"}
                className={`w-full p-3 pr-12 border border-slate-200 rounded-xl outline-none font-mono text-sm transition-colors ${
                  isSandbox ? "focus:border-orange-500" : "focus:border-blue-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              {isSandbox ? "Secret Key de Pruebas (Privado)" : "Secret Key de Producción (Privado)"}
            </label>
            <div className="relative">
              <input
                type={showSecretKey ? "text" : "password"}
                // Vinculación dinámica
                value={isSandbox ? config.sandboxSecretKey : config.productionSecretKey}
                onChange={(e) => setConfig({ 
                  ...config, 
                  [isSandbox ? "sandboxSecretKey" : "productionSecretKey"]: e.target.value 
                })}
                placeholder={isSandbox ? "sk_test_xxxxxxxxxxxxxxxxxx" : "sk_live_xxxxxxxxxxxxxxxxxx"}
                className={`w-full p-3 pr-12 border border-slate-200 rounded-xl outline-none font-mono text-sm transition-colors ${
                  isSandbox ? "focus:border-orange-500" : "focus:border-blue-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showSecretKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs flex items-center gap-1 mt-2 italic text-red-500 font-medium">
              ⚠️ Nunca compartas tu Secret Key. Mantenla segura.
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">Activar Bold para Clientes</h3>
              <p className="text-xs text-slate-500 mt-1">
                Permite a los usuarios elegir Bold para pagar en la tienda.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfig({ ...config, enabled: !config.enabled })}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                config.enabled ? "bg-green-500" : "bg-slate-300"
              }`}
            >
              <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                config.enabled ? "translate-x-6" : "translate-x-0"
              }`} />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-900 transition-all shadow-lg shadow-slate-800/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={20} />
          {saving ? "Guardando..." : "Guardar Configuración"}
        </button>
      </form>

      <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-2xl">
        <p className="text-sm font-bold text-slate-800 mb-2">📌 ¿Dónde encuentro mis llaves API?</p>
        <ol className="text-sm text-slate-600 space-y-2 ml-4 list-decimal mb-4">
          <li>Inicia sesión en tu cuenta de <strong>Bold Biz</strong> u <strong>Olimpo</strong>.</li>
          <li>Ve a <strong>Integraciones</strong> o <strong>Configuración API Variables</strong>.</li>
          <li>Asegúrate de copiar las correctas para cada caso (Las de Prueba dicen <code className="bg-slate-200 px-1 rounded text-xs">test</code> y las reales dicen <code className="bg-slate-200 px-1 rounded text-xs">live</code>).</li>
          <li>Pégalas en los cuadros de arriba y oprime Guardar.</li>
        </ol>
        <a 
          href="https://bold.co/developers" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold"
        >
          Ver documentación de Bold ↗
        </a>
      </div>
    </div>
  );
}
