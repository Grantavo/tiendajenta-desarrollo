import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  Layout,
  Type,
  Cloud,
  Link as LinkIcon,
  ChevronDown,
} from "lucide-react";

import { toast } from "sonner";
import { db } from "../../firebase/config";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

export default function Banners() {
  const [loading, setLoading] = useState(true);

  // --- 1. ESTADOS ---
  const [banners, setBanners] = useState([]);
  const [topBar, setTopBar] = useState({
    text: "🎉 ¡Envío GRATIS en compras superiores a $200.000!",
    bgColor: "#0f172a",
    textColor: "#ffffff",
    isActive: true,
  });

  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);

  // --- 2. CARGAR DATOS (Solo al montar el componente) ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const docRef = doc(db, "banners", "design");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.banners) setBanners(data.banners);
          if (data.topBar) setTopBar(data.topBar);
        } else {
          setBanners([
            {
              id: 1,
              title: "LA MEJOR TECNOLOGÍA",
              subtitle: "Descubre nuestra nueva colección.",
              btnText: "Ver Ofertas",
              link: "/productos",
              linkType: "product",
              targetId: "",
              subTargetId: "",
              image: null,
              active: true,
            },
          ]);
        }

        const [prodsSnap, catsSnap] = await Promise.all([
          getDocs(collection(db, "products")),
          getDocs(collection(db, "categories")),
        ]);

        setAvailableProducts(
          prodsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
        setAvailableCategories(
          catsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
      } catch (error) {
        console.error("Error cargando datos:", error);
        toast.error("No se pudo cargar el diseño");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // --- 3. PERSISTENCIA LOCAL CORREGIDA ---
  // He eliminado la dependencia de 'localStorage' dentro del effect para evitar bucles
  // y asegurar que el borrado sea definitivo en la sesión actual.
  useEffect(() => {
    if (!loading) {
      localStorage.setItem("shopBanners", JSON.stringify(banners));

      // Actualizamos shopDesign sin disparar re-cargas infinitas
      const designToSave = {
        topBar: topBar,
        updatedAt: new Date().getTime(),
      };
      localStorage.setItem("shopDesign", JSON.stringify(designToSave));

      // Solo lanzamos el evento si es estrictamente necesario para otros componentes
      window.dispatchEvent(new Event("storage"));
    }
  }, [banners, topBar, loading]);

  // --- 4. FUNCIONES ---

  const handleSaveToCloud = async () => {
    try {
      const designData = { banners, topBar, updatedAt: new Date() };
      await setDoc(doc(db, "banners", "design"), designData);
      toast.success("¡Diseño guardado en la nube! ☁️");
    } catch (error) {
      console.error("Error guardando:", error);
      toast.error("Error al guardar");
    }
  };

  const handleImageUpload = (id, e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1000000) {
        toast.warning("Imagen muy pesada (Máx 1MB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setBanners((prev) =>
          prev.map((b) => (b.id === id ? { ...b, image: reader.result } : b))
        );
      };
      reader.readAsDataURL(file);
    }
  };

  const addBanner = () => {
    setBanners((prev) => [
      ...prev,
      {
        id: Date.now(),
        title: "NUEVA OFERTA",
        subtitle: "Descripción...",
        btnText: "Ver más",
        link: "",
        linkType: "product",
        targetId: "",
        subTargetId: "",
        image: null,
        active: true,
      },
    ]);
    toast.success("Nuevo slide agregado");
  };

  const deleteBanner = (id) => {
    if (banners.length === 1) {
      toast.warning("Debes mantener al menos un banner.");
      return;
    }
    if (window.confirm("¿Eliminar este banner?")) {
      // Al filtrar aquí, el useEffect de persistencia actualizará el localStorage
      // con la lista corta, eliminando el banner definitivamente.
      setBanners((prev) => prev.filter((b) => b.id !== id));
      toast.info("Banner quitado de la lista");
    }
  };

  const updateBannerText = (id, field, value) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  const updateLinkLogic = (id, type, targetId = "", subTargetId = "") => {
    let finalLink = "/productos";
    if (type === "product" && targetId) {
      finalLink = `/producto/${targetId}`;
    } else if (type === "category" && targetId) {
      finalLink = `/categoria/${targetId}`;
      if (subTargetId) finalLink += `?sub=${encodeURIComponent(subTargetId)}`;
    }

    setBanners((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              linkType: type,
              targetId: targetId,
              subTargetId: subTargetId,
              link: finalLink,
            }
          : b
      )
    );
  };

  if (loading)
    return (
      <div className="p-10 text-center text-slate-400">Cargando diseño...</div>
    );

  return (
    <div className="p-6 max-w-5xl mx-auto pb-20">
      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Diseño de la Tienda
          </h1>
          <p className="text-sm text-slate-500">
            Gestiona los banners promocionales.
          </p>
        </div>
        <button
          onClick={handleSaveToCloud}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg"
        >
          <Cloud size={20} /> Guardar en Nube
        </button>
      </div>

      {/* TOPBAR */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
        <h2 className="font-bold text-lg text-slate-700 mb-4 flex items-center gap-2">
          <Type size={20} className="text-blue-600" /> Barra de Anuncios
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Mensaje
            </label>
            <input
              type="text"
              value={topBar.text}
              onChange={(e) => setTopBar({ ...topBar, text: e.target.value })}
              className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Fondo
              </label>
              <div className="flex items-center gap-2 border p-2 rounded-xl">
                <input
                  type="color"
                  value={topBar.bgColor}
                  onChange={(e) =>
                    setTopBar({ ...topBar, bgColor: e.target.value })
                  }
                  className="w-8 h-8 rounded border-none cursor-pointer"
                />
                <span className="text-xs text-slate-400">{topBar.bgColor}</span>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Texto
              </label>
              <div className="flex items-center gap-2 border p-2 rounded-xl">
                <input
                  type="color"
                  value={topBar.textColor}
                  onChange={(e) =>
                    setTopBar({ ...topBar, textColor: e.target.value })
                  }
                  className="w-8 h-8 rounded border-none cursor-pointer"
                />
                <span className="text-xs text-slate-400">
                  {topBar.textColor}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div
          className="mt-4 p-2 rounded-lg text-center text-sm font-bold shadow-sm"
          style={{ backgroundColor: topBar.bgColor, color: topBar.textColor }}
        >
          {topBar.text}
        </div>
      </div>

      {/* CARRUSEL DE BANNERS */}
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <h2 className="font-bold text-lg text-slate-700 flex items-center gap-2">
            <Layout size={20} className="text-blue-600" /> Carrusel Principal
          </h2>
          <button
            onClick={addBanner}
            className="text-sm font-bold text-blue-600 flex items-center gap-1 hover:bg-blue-50 px-3 py-1 rounded-lg transition"
          >
            <Plus size={16} /> Agregar Slide
          </button>
        </div>

        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 animate-in slide-in-from-bottom-2"
          >
            <div className="w-full md:w-1/3 aspect-video bg-slate-100 rounded-xl relative overflow-hidden group border-2 border-dashed border-slate-300 hover:border-blue-400 transition cursor-pointer">
              {banner.image ? (
                <img
                  src={banner.image}
                  alt="Banner"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                  <ImageIcon size={32} className="mb-2" />
                  <span className="text-xs font-bold">
                    Click para subir (PC)
                  </span>
                </div>
              )}
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept="image/*"
                onChange={(e) => handleImageUpload(banner.id, e)}
              />
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex justify-between">
                <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-500">
                  Slide #{index + 1}
                </span>
                <button
                  onClick={() => deleteBanner(banner.id)}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <input
                  type="text"
                  placeholder="Título Grande"
                  className="w-full p-2 border-b font-bold text-lg outline-none focus:border-blue-500"
                  value={banner.title}
                  onChange={(e) =>
                    updateBannerText(banner.id, "title", e.target.value)
                  }
                />
                <input
                  type="text"
                  placeholder="Subtítulo"
                  className="w-full p-2 border-b text-slate-600 outline-none focus:border-blue-500"
                  value={banner.subtitle}
                  onChange={(e) =>
                    updateBannerText(banner.id, "subtitle", e.target.value)
                  }
                />

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Texto Botón"
                    className="w-full p-2 border-b text-blue-600 font-bold text-sm outline-none focus:border-blue-500"
                    value={banner.btnText}
                    onChange={(e) =>
                      updateBannerText(banner.id, "btnText", e.target.value)
                    }
                  />

                  <div className="flex flex-col gap-2">
                    <div className="relative">
                      <select
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:border-blue-500 appearance-none cursor-pointer"
                        value={banner.linkType || "product"}
                        onChange={(e) =>
                          updateLinkLogic(banner.id, e.target.value, "", "")
                        }
                      >
                        <option value="product">Producto Específico</option>
                        <option value="category">Categoría Específica</option>
                      </select>
                      <ChevronDown
                        size={14}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                    </div>

                    {banner.linkType === "product" && (
                      <select
                        className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs text-slate-600 outline-none focus:border-blue-500"
                        value={banner.targetId || ""}
                        onChange={(e) =>
                          updateLinkLogic(banner.id, "product", e.target.value)
                        }
                      >
                        <option value="">Selecciona un producto...</option>
                        {availableProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    )}

                    {banner.linkType === "category" && (
                      <div className="flex flex-col gap-2">
                        <select
                          className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs text-slate-600 outline-none focus:border-blue-500"
                          value={banner.targetId || ""}
                          onChange={(e) =>
                            updateLinkLogic(
                              banner.id,
                              "category",
                              e.target.value,
                              ""
                            )
                          }
                        >
                          <option value="">Selecciona una categoría...</option>
                          {availableCategories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>

                        {(() => {
                          const selectedCat = availableCategories.find(
                            (c) => String(c.id) === String(banner.targetId)
                          );
                          if (selectedCat?.subcategories?.length > 0) {
                            return (
                              <select
                                className="w-full p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-slate-600 outline-none focus:border-blue-500"
                                value={banner.subTargetId || ""}
                                onChange={(e) =>
                                  updateLinkLogic(
                                    banner.id,
                                    "category",
                                    banner.targetId,
                                    e.target.value
                                  )
                                }
                              >
                                <option value="">
                                  Todas las subcategorías
                                </option>
                                {selectedCat.subcategories.map((sub, idx) => {
                                  const subName =
                                    typeof sub === "string" ? sub : sub.name;
                                  return (
                                    <option key={idx} value={subName}>
                                      {subName}
                                    </option>
                                  );
                                })}
                              </select>
                            );
                          }
                        })()}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 px-1">
                      <LinkIcon size={10} />
                      <span className="truncate max-w-[150px]">
                        {banner.link || "Sin enlace"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
