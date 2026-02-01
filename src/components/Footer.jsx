import React, { useState } from "react";

export default function Footer() {
  // LÓGICA DE ESTADO (Intacta)
  const [shopInfo] = useState(() => {
    const defaults = {
      nombre: "TIENDA GENTA",
      direccion: "Pasto, Nariño, Colombia",
      telefono: "+57 300 123 4567",
      email: "contacto@tiendagenta.com",
      facebook: "", // Lo dejamos vacío por defecto para probar la lógica
      instagram: "",
      tiktok: "",
    };

    try {
      const savedSettings = localStorage.getItem("shopSettings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        return {
          nombre: parsed.nombre || defaults.nombre,
          direccion: parsed.direccion || defaults.direccion,
          telefono: parsed.telefono || defaults.telefono,
          email: parsed.email || defaults.email,
          facebook: parsed.facebook || defaults.facebook,
          instagram: parsed.instagram || defaults.instagram,
          tiktok: parsed.tiktok || defaults.tiktok,
        };
      }
    } catch (error) {
      console.error("Error cargando configuración:", error);
    }
    return defaults;
  });

  // --- HELPER MEJORADO ---
  // Lógica: Si el admin no puso nada, redirige a la home de la red social.
  const getSocialUrl = (userEntry, socialBaseUrl) => {
    // 1. Si está vacío, nulo o es "#", devolvemos la URL base (Ej: https://instagram.com)
    // Esto cumple con "redirigir a una página por defecto".
    if (!userEntry || userEntry === "#" || userEntry.trim() === "") {
      return socialBaseUrl;
    }

    // 2. Si el admin pegó el link completo (https://...), lo respetamos.
    if (userEntry.startsWith("http")) return userEntry;

    // 3. Si puso solo el usuario (@jenta), armamos el link.
    return `${socialBaseUrl}/${userEntry.replace("@", "").replace("/", "")}`;
  };

  return (
    <footer className="bg-white border-t border-gray-200 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* COLUMNA 1: IDENTIDAD */}
          <div className="flex flex-col items-center md:items-start">
            <span className="font-bold text-2xl text-red-600 tracking-tighter mb-4 uppercase">
              {shopInfo.nombre}
            </span>
            <p className="text-gray-500 text-sm text-center md:text-left leading-relaxed max-w-xs">
              Tu destino premium para tecnología, moda y estilo de vida. Calidad
              garantizada en cada pedido.
            </p>
          </div>

          {/* COLUMNA 2: CONTACTO DIRECTO */}
          <div className="flex flex-col items-center md:items-start">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
              Contáctanos
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors cursor-pointer">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-sm">{shopInfo.direccion}</span>
              </li>
              <li className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors cursor-pointer">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <span className="text-sm">{shopInfo.telefono}</span>
              </li>
              <li className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors cursor-pointer">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm break-all">{shopInfo.email}</span>
              </li>
            </ul>
          </div>

          {/* COLUMNA 3: REDES SOCIALES */}
          <div className="flex flex-col items-center md:items-start">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
              Síguenos
            </h3>
            <div className="flex space-x-4">
              {/* Instagram */}
              <a
                href={getSocialUrl(shopInfo.instagram, "https://instagram.com")}
                target="_blank"
                rel="noreferrer"
                title={
                  !shopInfo.instagram
                    ? "Página principal de Instagram"
                    : "Visitar Instagram"
                }
                className="text-gray-400 hover:text-pink-600 transition-colors transform hover:scale-110"
              >
                <svg
                  className="h-8 w-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>

              {/* Facebook */}
              <a
                href={getSocialUrl(shopInfo.facebook, "https://facebook.com")}
                target="_blank"
                rel="noreferrer"
                title={
                  !shopInfo.facebook
                    ? "Página principal de Facebook"
                    : "Visitar Facebook"
                }
                className="text-gray-400 hover:text-blue-700 transition-colors transform hover:scale-110"
              >
                <svg
                  className="h-8 w-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>

              {/* TikTok */}
              <a
                href={getSocialUrl(shopInfo.tiktok, "https://tiktok.com")}
                target="_blank"
                rel="noreferrer"
                title={
                  !shopInfo.tiktok
                    ? "Página principal de TikTok"
                    : "Visitar TikTok"
                }
                className="text-gray-400 hover:text-black transition-colors transform hover:scale-110"
              >
                <svg
                  className="h-8 w-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* COPYRIGHT */}
        <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-400 text-center md:text-left">
            &copy; {new Date().getFullYear()} {shopInfo.nombre}. Todos los
            derechos reservados.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0 text-sm text-gray-400">
            <a href="#" className="hover:text-red-600">
              Políticas de Privacidad
            </a>
            <a href="#" className="hover:text-red-600">
              Términos y Condiciones
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
