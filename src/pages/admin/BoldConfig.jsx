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
    apiKey: "",
    secretKey: "",
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
          setConfig(docSnap.data());
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
            {config.enabled ? "Bold está activo" : "Bold está desactivado"}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            {config.enabled 
              ? "Los clientes pueden pagar con tarjeta de crédito/débito y PSE." 
              : "Activa Bold después de configurar tus llaves API."}
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
                config.mode === "sandbox"
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className="font-bold text-slate-800">��� Sandbox (Pruebas)</p>
              <p className="text-xs text-slate-500 mt-1">Para desarrollo y testing</p>
            </button>
            <button
              type="button"
              onClick={() => setConfig({ ...config, mode: "production" })}
              className={`p-4 rounded-xl border-2 transition-all ${
                config.mode === "production"
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className="font-bold text-slate-800">��� Producción</p>
              <p className="text-xs text-slate-500 mt-1">Para pagos reales</p>
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Llaves API de Bold</h3>
          
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              API Key (Público)
            </label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="pk_live_xxxxxxxxxxxxxxxxxx"
                className="w-full p-3 pr-12 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono text-sm"
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
              Secret Key (Privado)
            </label>
            <div className="relative">
              <input
                type={showSecretKey ? "text" : "password"}
                value={config.secretKey}
                onChange={(e) => setConfig({ ...config, secretKey: e.target.value })}
                placeholder="sk_live_xxxxxxxxxxxxxxxxxx"
                className="w-full p-3 pr-12 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showSecretKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2 italic">
              ⚠️ Nunca compartas tu Secret Key. Mantenla segura.
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">Activar Bold</h3>
              <p className="text-xs text-slate-500 mt-1">
                Permite a los clientes pagar con Bold en el carrito
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
          className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={20} />
          {saving ? "Guardando..." : "Guardar Configuración"}
        </button>
      </form>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-sm font-bold text-blue-800 mb-2">��� ¿Dónde encuentro mis llaves API?</p>
        <ol className="text-xs text-blue-700 space-y-1 ml-4 list-decimal">
          <li>Inicia sesión en tu cuenta de Bold</li>
          <li>Ve a Configuración → API Keys</li>
          <li>Copia tu API Key y Secret Key</li>
          <li>Pégalas aquí y guarda</li>
        </ol>
        <a 
          href="https://bold.co/developers" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline mt-2 inline-block font-bold"
        >
          Ver documentación de Bold →
        </a>
      </div>
    </div>
  );
}
