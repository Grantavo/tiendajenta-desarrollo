import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ShoppingBag, Ticket, Copy } from "lucide-react";
import { toast } from "sonner";

import { db } from "../firebase/config";
import {
  collection,
  query,
  where,
  limit,
  doc,
  onSnapshot,
} from "firebase/firestore";

import ProductCard from "../components/ProductCard";
import LoadingSpinner from "../components/LoadingSpinner";

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [banners, setBanners] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    setLoading(true);

    let bannersLoaded = false;
    let categoriesLoaded = false;
    let productsLoaded = false;

    // Helper para quitar la pantalla de carga solo cuando los tres datos estén listos
    const checkAllLoaded = () => {
      if (bannersLoaded && categoriesLoaded && productsLoaded) {
        setLoading(false);
      }
    };

    // A. Diseño (banners) en Tiempo Real
    const unsubBanners = onSnapshot(
      doc(db, "banners", "design"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setBanners(data.banners || []);
        } else {
          setBanners([
            {
              id: 999,
              title: "BIENVENIDO",
              subtitle: "Explora nuestro catálogo completo",
              btnText: "Ver Productos",
              link: "/productos",
              image: null,
              active: true,
            },
          ]);
        }
        bannersLoaded = true;
        checkAllLoaded();
      },
      (error) => {
        console.error("Error cargando banners:", error);
        bannersLoaded = true;
        checkAllLoaded();
      }
    );

    // B. Categorías en Tiempo Real
    const unsubCategories = onSnapshot(
      collection(db, "categories"),
      (snapshot) => {
        const catsData = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setCategories(catsData);
        categoriesLoaded = true;
        checkAllLoaded();
      },
      (error) => {
        console.error("Error cargando categorías:", error);
        categoriesLoaded = true;
        checkAllLoaded();
      }
    );

    // C. Productos destacados en Tiempo Real
    const q = query(collection(db, "products"), where("bestSeller", "==", "si"), limit(4));
    const unsubProducts = onSnapshot(
      q,
      (snapshot) => {
        const prodsData = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setFeaturedProducts(prodsData);
        productsLoaded = true;
        checkAllLoaded();
      },
      (error) => {
        console.error("Error cargando productos destacados:", error);
        productsLoaded = true;
        checkAllLoaded();
      }
    );

    // Cleanup phase: Desuscribirse de todos los listeners al cerrar la página
    return () => {
      unsubBanners();
      unsubCategories();
      unsubProducts();
    };
  }, []);

  // --- Carrusel ---
  const activeBannersList = banners.filter((b) => b.active !== false);

  const prevSlide = () =>
    setCurrentSlide((curr) =>
      curr === 0 ? activeBannersList.length - 1 : curr - 1,
    );

  const nextSlide = () =>
    setCurrentSlide((curr) => (curr + 1) % activeBannersList.length);

  useEffect(() => {
    if (activeBannersList.length <= 1) return;
    const interval = setInterval(
      () => setCurrentSlide((prev) => (prev + 1) % activeBannersList.length),
      5000,
    );
    return () => clearInterval(interval);
  }, [activeBannersList.length]);

  const activeBanner =
    activeBannersList.length > 0 ? activeBannersList[currentSlide] : banners[0];

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!activeBanner) return null;

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans">


      {/* HERO (SPLIT LAYOUT REDESIGN) */}
      <div className="relative overflow-hidden h-[500px] md:h-[600px] bg-white border-b border-slate-100 group">
        
        {/* FONDO DINÁMICO (Glow Effect) */}
        <div className="absolute inset-0 z-0">
           <div className={`absolute top-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px] transition-all duration-1000 ${
             activeBanner.textOverlay === "right" ? "left-[-100px]" : "right-[-100px]"
           }`} style={{ backgroundColor: activeBanner.btnColor || "#dc2626" }}></div>
        </div>

        <div className="container mx-auto h-full px-6 md:px-12 relative z-10">
          <div className={`flex flex-col md:flex-row items-center justify-between h-full gap-8 md:gap-0 ${
            activeBanner.textOverlay === "right" ? "md:flex-row-reverse" : ""
          }`}>
            
            {/* TEXTO (COLUMNA 1) */}
            <div className={`w-full md:w-1/2 flex flex-col justify-center transition-all duration-700 delay-100 ${
              activeBanner.textOverlay === "right" ? "items-end text-right" : "items-start text-left"
            }`}>
              <span className="inline-block px-4 py-1.5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold tracking-widest uppercase mb-6 animate-in fade-in slide-in-from-bottom-2">
                Oferta Especial
              </span>
              <h1
                className="text-4xl md:text-6xl font-black mb-6 leading-[1.1] tracking-tight text-slate-900"
              >
                {activeBanner.title}
              </h1>
              {activeBanner.subtitle && activeBanner.subtitle !== "Descripción..." && (
                <p
                  className="text-xl text-slate-500 mb-10 max-w-lg leading-relaxed font-medium"
                >
                  {activeBanner.subtitle}
                </p>
              )}
              <Link to={activeBanner.link || "/productos"}>
                <button
                  className="group relative px-10 py-4 rounded-2xl font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all text-white overflow-hidden"
                  style={{ backgroundColor: activeBanner.btnColor || "#dc2626" }}
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <span className="relative z-10 flex items-center gap-2">
                    {activeBanner.btnText || "Ver Productos"}
                    <ChevronRight size={18} />
                  </span>
                </button>
              </Link>
            </div>

            {/* PRODUCTO (COLUMNA 2) */}
            <div className="w-full md:w-1/2 h-[250px] md:h-full flex items-center justify-center relative">
               {/* Sombra proyectada suave debajo del producto */}
               <div className="absolute bottom-[20%] w-1/2 h-8 bg-black/10 blur-2xl rounded-[100%] scale-x-150"></div>
               
               {activeBanner.image ? (
                 <img
                   src={activeBanner.image}
                   alt={activeBanner.title}
                   fetchpriority="high"
                   decoding="async"
                   className="max-w-full max-h-[85%] object-contain relative z-10 transition-transform duration-700 hover:scale-110 drop-shadow-[0_25px_25px_rgba(0,0,0,0.1)]"
                 />
               ) : (
                 <div className="w-64 h-64 bg-slate-50 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center">
                    <ShoppingBag size={48} className="text-slate-200" />
                 </div>
               )}
            </div>

          </div>
        </div>

        {/* Botones de navegación (Estilo minimalista) */}
        {activeBannersList.length > 1 && (
          <div className="absolute bottom-10 right-12 z-30 flex gap-4">
            <button
              onClick={prevSlide}
              className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-400 hover:shadow-lg transition-all"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              className="p-3 rounded-2xl bg-slate-900 text-white shadow-xl hover:bg-slate-800 hover:scale-105 transition-all"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>



      {/* CATEGORÍAS POPULARES */}
      <div className="container mx-auto px-4 mt-8 relative z-10">
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">
              Categorías Populares
            </h2>
            <p className="text-sm text-slate-400">Explora por departamento</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/categoria/${cat.id}`}
                className="group cursor-pointer flex flex-col items-center gap-3"
              >
                <div className="relative w-full aspect-square rounded-full overflow-hidden bg-white border-2 border-slate-100 shadow-sm transition-all duration-300 group-hover:border-red-500 group-hover:shadow-xl group-hover:scale-105">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50 transition-colors duration-300 group-hover:bg-red-50">
                      <ShoppingBag className="text-slate-300 transition-colors duration-300 group-hover:text-red-500" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                </div>
                <h3 className="font-bold text-slate-700 text-sm transition-colors duration-300 group-hover:text-red-600">
                  {cat.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* PRODUCTOS DESTACADOS */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
