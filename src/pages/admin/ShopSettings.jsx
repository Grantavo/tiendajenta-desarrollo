import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Save,
  Trash2,
  Link as LinkIcon,
  Smartphone,
  Globe,
  QrCode,
  ExternalLink,
} from "lucide-react";

// 1. IMPORTAR SONNER
import { toast } from "sonner";

// 2. IMPORTAR FIREBASE
import { db } from "../../firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function ShopSettings() {
  const [loading, setLoading] = useState(true);

  // 1. ESTADO DEL FORMULARIO
  const [formData, setFormData] = useState({
    nombre: "Tienda Jenta",
    telefono: "3026043683",
    direccion: "Pasto",
    email: "grupojenta@gmail.com",
    eslogan: "Todo a un solo click",
    instagram: "",
    facebook: "",
    whatsapp: "",
    tiktok: "",
    qrLink: "",
  });

  // 2. ESTADO DEL LOGO
  const [logoPreview, setLogoPreview] = useState(
    "https://ui-avatars.com/api/?name=Tienda+Jenta&background=0D8ABC&color=fff&size=200"
  );

  const fileInputRef = useRef(null);

  // --- 3. EFECTO: CARGAR DESDE LA NUBE ---
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "settings", "shop");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData((prev) => ({ ...prev, ...data }));
          if (data.logo) {
            setLogoPreview(data.logo);
            localStorage.setItem("shopLogo", data.logo);
            localStorage.setItem("shopSettings", JSON.stringify(data));
            window.dispatchEvent(new Event("storage"));
          }
        } else {
          // Si no existe en la nube, intentamos leer de localStorage
          const savedData = localStorage.getItem("shopSettings");
          if (savedData) {
            setFormData((prev) => ({ ...prev, ...JSON.parse(savedData) }));
          }
          const savedLogo = localStorage.getItem("shopLogo");
          if (savedLogo) setLogoPreview(savedLogo);
        }
      } catch (error) {
        console.error("Error cargando configuración:", error);
        toast.error("Error al cargar la configuración");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1000000) {
        toast.warning("Imagen muy pesada", {
          description: "Intenta con una imagen menor a 1MB.",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const formatPhoneForWhatsApp = (number) => {
    if (!number) return "";
    let cleanNumber = number.replace(/\D/g, "");
    if (cleanNumber.length === 10) {
      return `57${cleanNumber}`;
    }
    return cleanNumber;
  };

  const handleDownloadQR = async () => {
    const targetUrl = formData.qrLink
      ? formData.qrLink
      : window.location.origin;

    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&margin=20&data=${encodeURIComponent(
      targetUrl
    )}`;

    try {
      const response = await fetch(apiUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `QR-${formData.nombre.replace(/\s+/g, "-")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("¡QR Generado!", {
        description: `Este código redirige a: ${targetUrl}`,
      });
    } catch (error) {
      console.error(error);
      toast.error("Error generando el QR");
    }
  };

  // --- GUARDAR CAMBIOS ---
  const handleSave = async () => {
    try {
      const rawPhone = formData.whatsapp || formData.telefono;
      const finalPhone = formatPhoneForWhatsApp(rawPhone);

      const settingsToSave = {
        ...formData,
        phone: finalPhone,
        logo: logoPreview,
        updatedAt: new Date(),
      };

      // 1. Guardar en FIREBASE
      await setDoc(doc(db, "settings", "shop"), settingsToSave);

      // 2. Guardar en LOCALSTORAGE (Para reactividad inmediata)
      localStorage.setItem("shopSettings", JSON.stringify(settingsToSave));
      localStorage.setItem("shopLogo", logoPreview);

      document.title = formData.nombre;
      window.dispatchEvent(new Event("storage"));

      toast.success("¡Configuración guardada!", {
        description: "Los cambios ya están en la nube ☁️",
      });
    } catch (error) {
      console.error("Error al guardar:", error);
      if (
        error.code === "resource-exhausted" ||
        error.message.includes("exceeds the maximum allowed size")
      ) {
        toast.error("Error de tamaño", {
          description: "La imagen es muy pesada para la base de datos.",
        });
      } else {
        toast.error("Error al guardar la configuración");
      }
    }
  };

  const handleReset = async () => {
    if (
      window.confirm(
        "¿Restablecer valores? Esto no borrará los datos de la nube, solo limpiará tu vista actual."
      )
    ) {
      localStorage.removeItem("shopSettings");
      localStorage.removeItem("shopLogo");
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-400">
        Cargando configuración...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Configuración de la Tienda
          </h2>
          <p className="text-sm text-slate-500">
            Personaliza la identidad y contacto de tu comercio
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12 relative overflow-hidden">
        {/* Decoración */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none"></div>

        {/* LOGO */}
        <div className="flex flex-col items-center mb-10 relative z-10">
          <div className="relative group">
            <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-white shadow-xl bg-slate-50 relative">
              <img
                src={logoPreview}
                alt="Logo"
                className="w-full h-full object-cover"
              />
              <div
                onClick={triggerFileInput}
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="text-white" size={32} />
              </div>
            </div>
            <button
              onClick={triggerFileInput}
              className="absolute bottom-1 right-1 bg-blue-600 text-white p-2.5 rounded-full shadow-lg hover:bg-blue-700 transition-all border-2 border-white"
            >
              <Camera size={18} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-600">
            Logo de la Tienda
          </p>
          {/* --- AQUÍ ESTÁ LA NUEVA SUGERENCIA --- */}
          <p className="text-xs text-slate-400 mt-1">
            Sugerido: Formato cuadrado (1:1), mín. 300x300px
          </p>
        </div>

        {/* FORMULARIO */}
        <form className="space-y-8 relative z-10">
          {/* Datos Básicos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                Nombre (*)
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-700 bg-slate-50 focus:bg-white"
                placeholder="Ej: Tienda Jenta"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                Teléfono (*)
              </label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-700 bg-slate-50 focus:bg-white"
                placeholder="Ej: 3001234567"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                Dirección (*)
              </label>
              <input
                type="text"
                name="direccion"
                value={formData.direccion}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-700 bg-slate-50 focus:bg-white"
                placeholder="Ej: Pasto, Nariño"
              />
            </div>
          </div>



          {/* Email y Eslogan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                Email Corporativo
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-700 bg-slate-50 focus:bg-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                Eslogan
              </label>
              <input
                type="text"
                name="eslogan"
                value={formData.eslogan}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-700 bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Redes Sociales */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Globe size={16} className="text-blue-500" /> Redes Sociales
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                  Instagram
                </label>
                <div className="relative">
                  <LinkIcon
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    name="instagram"
                    value={formData.instagram}
                    onChange={handleInputChange}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 outline-none transition-all text-slate-700 bg-slate-50 focus:bg-white placeholder:text-slate-300"
                    placeholder="@usuario"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                  Facebook
                </label>
                <div className="relative">
                  <LinkIcon
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    name="facebook"
                    value={formData.facebook}
                    onChange={handleInputChange}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all text-slate-700 bg-slate-50 focus:bg-white placeholder:text-slate-300"
                    placeholder="/pagina"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                  WhatsApp (Pedidos)
                </label>
                <div className="relative">
                  <Smartphone
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleInputChange}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all text-slate-700 bg-slate-50 focus:bg-white placeholder:text-slate-300"
                    placeholder="3001234567"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                  TikTok
                </label>
                <div className="relative">
                  <LinkIcon
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    name="tiktok"
                    value={formData.tiktok}
                    onChange={handleInputChange}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-black focus:ring-4 focus:ring-black/5 outline-none transition-all text-slate-700 bg-slate-50 focus:bg-white placeholder:text-slate-300"
                    placeholder="@usuario"
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* --- CONFIGURACIÓN DEL CÓDIGO QR --- */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <QrCode size={16} className="text-purple-500" /> Configuración de
              Código QR
            </h3>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                  Enlace Personalizado para el QR
                </label>
                <div className="relative">
                  <ExternalLink
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    name="qrLink"
                    value={formData.qrLink}
                    onChange={handleInputChange}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all text-slate-700 bg-white placeholder:text-slate-400"
                    placeholder="https://mitienda.com (Déjalo vacío para usar el link automático)"
                  />
                </div>
                <p className="text-[10px] text-slate-400 ml-1">
                  Si lo dejas vacío, el QR llevará a la dirección actual de la
                  página.
                </p>
              </div>
            </div>
          </div>

          {/* --- BOTONES DE ACCIÓN --- */}
          <div className="flex flex-col md:flex-row items-center gap-4 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSave}
              className="w-full md:flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Save size={20} />
              Guardar Cambios
            </button>

            <button
              type="button"
              onClick={handleDownloadQR}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-95"
              title="Descargar QR de la Tienda"
            >
              <QrCode size={20} />
              Generar QR
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="w-full md:w-auto flex items-center justify-center bg-slate-800 hover:bg-slate-900 text-white px-4 py-3.5 rounded-xl shadow-lg shadow-slate-800/20 transition-all hover:scale-105 active:scale-95"
              title="Restablecer"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
