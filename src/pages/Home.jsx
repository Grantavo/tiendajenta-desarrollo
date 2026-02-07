import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ShoppingBag, Ticket, Copy } from "lucide-react";
import { toast } from "sonner";

import { db } from "../firebase/config";
import {
  collection,
  getDocs,
  query,
  where,
  limit,
  doc,
  getDoc,
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
    const fetchFirebaseData = async () => {
      try {
        setLoading(true);

        // A. Diseño (banners) - Ya no traemos topBar aquí
        const designDoc = await getDoc(doc(db, "banners", "design"));
        if (designDoc.exists()) {
          const data = designDoc.data();
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

        // B. Categorías
        const catRef = collection(db, "categories");
        const catSnap = await getDocs(catRef);

        const catsData = catSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        setCategories(catsData);

        // C. Productos destacados
        const prodRef = collection(db, "products");
        const q = query(prodRef, where("bestSeller", "==", "si"), limit(4));
        const prodSnap = await getDocs(q);

        const prodsData = prodSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        setFeaturedProducts(prodsData);
      } catch (error) {
        console.error("Error cargando desde Firebase:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFirebaseData();
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


      {/* HERO */}
      <div className="bg-slate-900 text-white relative overflow-hidden h-[400px] md:h-[500px] group">
        <div className="absolute inset-0">
          {activeBanner.image ? (
            <img
              src={activeBanner.image}
              alt="Banner"
              className="w-full h-full object-cover opacity-60"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-black"></div>
          )}
        </div>

        <div
          className={`relative z-10 h-full flex flex-col justify-center px-12 transition-all duration-300 ${
            activeBanner.textOverlay === "left"
              ? "items-start text-left pl-20"
              : activeBanner.textOverlay === "right"
                ? "items-end text-right pr-20"
                : "items-center text-center"
          }`}
        >
          <div className="max-w-2xl">
              <h1
                className="text-4xl md:text-6xl font-black mb-4 drop-shadow-lg"
                style={{ color: activeBanner.textColor || "#ffffff" }}
              >
                {activeBanner.title}
              </h1>
              <p
                className="text-xl md:text-2xl mb-8 drop-shadow-md font-medium"
                style={{ color: activeBanner.textColor || "#e2e8f0" }}
              >
                {activeBanner.subtitle}
              </p>
              <Link to={activeBanner.link || "/productos"}>
                <button
                  className="px-8 py-4 rounded-full font-bold shadow-xl hover:scale-105 transition-transform"
                  style={{
                    backgroundColor: activeBanner.btnColor || "#dc2626",
                    color: activeBanner.btnTextColor || "#ffffff",
                  }}
                >
                  {activeBanner.btnText || "Ver Productos"}
                </button>
              </Link>
          </div>
        </div>

        {/* Botones de navegación del carrusel */}
        {activeBannersList.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-sm transition-all z-20"
              aria-label="Banner anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-sm transition-all z-20"
              aria-label="Banner siguiente"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
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
