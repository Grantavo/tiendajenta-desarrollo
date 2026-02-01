import React, { useState, useEffect } from "react";

export default function WhatsAppFloat() {
  // 1. FUNCIÓN HELPER PARA LEER Y FORMATEAR EL NÚMERO
  const getWhatsAppNumber = () => {
    try {
      const settings = JSON.parse(localStorage.getItem("shopSettings") || "{}");

      // Prioridad: campo 'whatsapp', sino campo 'phone'
      const rawNum = settings.whatsapp || settings.phone;

      if (rawNum) {
        // A. Limpiamos caracteres no numéricos (espacios, +, -, paréntesis)
        let cleanNum = rawNum.replace(/\D/g, "");

        // B. LÓGICA DE INDICATIVO COLOMBIA (57)
        // Si el número no empieza por 57, se lo agregamos.
        // Ejemplo: "3001234567" -> "573001234567"
        if (!cleanNum.startsWith("57")) {
          cleanNum = `57${cleanNum}`;
        }

        return cleanNum;
      }
    } catch (e) {
      console.error("Error leyendo WhatsApp", e);
    }
    return null;
  };

  // 2. ESTADO CON INICIALIZACIÓN PEREZOSA
  const [phoneNumber, setPhoneNumber] = useState(getWhatsAppNumber);

  // 3. ESCUCHAR CAMBIOS EN TIEMPO REAL
  useEffect(() => {
    const handleStorageUpdate = () => {
      setPhoneNumber(getWhatsAppNumber());
    };

    window.addEventListener("storage", handleStorageUpdate);
    return () => window.removeEventListener("storage", handleStorageUpdate);
  }, []);

  // Si no hay número, no renderizamos nada
  if (!phoneNumber) return null;

  return (
    <a
      href={`https://wa.me/${phoneNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 group"
      title="¡Chatea con nosotros!"
      style={{ cursor: "pointer" }}
    >
      {/* Círculo Verde con Sombra y Animación */}
      <div className="bg-[#25D366] w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_14px_rgba(37,211,102,0.4)] hover:-translate-y-1 hover:scale-110 transition-all duration-300 relative">
        {/* Efecto de Onda (Ping) para llamar la atención */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-75 animate-ping group-hover:animate-none"></span>

        {/* Icono SVG Oficial de WhatsApp (Blanco) */}
        <svg
          viewBox="0 0 24 24"
          className="w-8 h-8 fill-white relative z-10"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </div>

      {/* Tooltip */}
      <span className="absolute right-16 top-1/2 -translate-y-1/2 bg-white text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-100 hidden md:block">
        ¿Necesitas ayuda?
      </span>
    </a>
  );
}
