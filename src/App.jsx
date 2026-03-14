import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "sonner";

import LoadingSpinner from "./components/LoadingSpinner";
import ErrorBoundary from "./components/ErrorBoundary";
import ShopLayout from "./layouts/ShopLayout";
import ProtectedRoute from "./pages/auth/ProtectedRoute";
import AutoLogout from "./components/AutoLogout";
import { CartProvider } from "./context/CartContext";

// --- LAZY CON RETRY ---
// Si un chunk falla al descargar (red lenta, deploy nuevo), lo reintenta hasta 3 veces.
// Si sigue fallando, recarga la página para obtener los chunks actualizados.
function lazyRetry(importFn) {
  return lazy(() =>
    new Promise((resolve, reject) => {
      const attempt = (retriesLeft) => {
        importFn()
          .then(resolve)
          .catch((error) => {
            if (retriesLeft > 0) {
              setTimeout(() => attempt(retriesLeft - 1), 1000);
            } else {
              // Si ya se reintentó y sigue fallando, recargar la página
              const hasRefreshed = sessionStorage.getItem("chunk_retry");
              if (!hasRefreshed) {
                sessionStorage.setItem("chunk_retry", "1");
                window.location.reload();
              } else {
                sessionStorage.removeItem("chunk_retry");
                reject(error);
              }
            }
          });
      };
      attempt(3);
    })
  );
}

// --- SCROLL TO TOP ---
// Resetea el scroll al navegar entre páginas.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// --- IMPORTACIONES LAZY CON RETRY ---
const AdminLayout = lazyRetry(() => import("./layouts/AdminLayout"));

const Home = lazyRetry(() => import("./pages/Home"));
const CategoryPage = lazyRetry(() => import("./pages/shop/CategoryPage"));
const ProductDetail = lazyRetry(() => import("./pages/shop/ProductDetail"));
const InvestmentDashboard = lazyRetry(() => import("./pages/shop/InvestmentDashboard"));
const AssetDetail = lazyRetry(() => import("./pages/shop/AssetDetail"));
const ShopProducts = lazyRetry(() => import("./pages/shop/Products"));
const ClientDashboard = lazyRetry(() => import("./pages/shop/ClientDashboard"));
const ThankYou = lazyRetry(() => import("./pages/shop/ThankYou"));

const Dashboard = lazyRetry(() => import("./pages/admin/Dashboard"));
const ShopSettings = lazyRetry(() => import("./pages/admin/ShopSettings"));
const Categories = lazyRetry(() => import("./pages/admin/Categories"));
const Products = lazyRetry(() => import("./pages/admin/Products"));
const Orders = lazyRetry(() => import("./pages/admin/Orders"));
const Banners = lazyRetry(() => import("./pages/admin/Banners"));
const Clients = lazyRetry(() => import("./pages/admin/Clients"));
const Users = lazyRetry(() => import("./pages/admin/Users"));
const Marketing = lazyRetry(() => import("./pages/admin/Marketing"));
const Payments = lazyRetry(() => import("./pages/admin/Payments"));
const BoldConfig = lazyRetry(() => import("./pages/admin/BoldConfig"));
const Shipping = lazyRetry(() => import("./pages/admin/Shipping"));
const Migration = lazyRetry(() => import("./pages/admin/Migration"));


export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AutoLogout />
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner fullScreen />}>
            <Routes>
              <Route path="/login" element={<Navigate to="/" replace />} />

              {/* TIENDA (Pública) */}
              <Route path="/" element={<ShopLayout />}>
                <Route index element={<Home />} />
                <Route path="categoria/:id" element={<CategoryPage />} />
                <Route path="producto/:id" element={<ProductDetail />} />
                <Route path="productos" element={<ShopProducts />} />
                <Route path="perfil" element={<ClientDashboard />} />
                <Route path="inversiones" element={<InvestmentDashboard />} />
                <Route path="inversiones/:symbol" element={<AssetDetail />} />
                <Route path="thank-you" element={<ThankYou />} />
              </Route>

              {/* ZONA ADMIN */}
              <Route element={<ProtectedRoute />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route element={<ProtectedRoute module="pedidos" />}>
                    <Route path="pedidos" element={<Orders />} />
                  </Route>
                  <Route element={<ProtectedRoute module="productos" />}>
                    <Route path="productos" element={<Products />} />
                  </Route>
                  <Route element={<ProtectedRoute module="categorias" />}>
                    <Route path="categorias" element={<Categories />} />
                  </Route>
                  <Route element={<ProtectedRoute module="clientes" />}>
                    <Route path="clientes" element={<Clients />} />
                  </Route>
                  <Route element={<ProtectedRoute module="usuarios" />}>
                    <Route path="usuarios" element={<Users />} />
                  </Route>
                  <Route element={<ProtectedRoute module="banners" />}>
                    <Route path="banners" element={<Banners />} />
                  </Route>
                  <Route element={<ProtectedRoute module="marketing" />}>
                    <Route path="marketing" element={<Marketing />} />
                  </Route>
                  <Route element={<ProtectedRoute module="ajustes" />}>
                    <Route path="pagos" element={<Payments />} />
                    <Route path="bold" element={<BoldConfig />} />
                    <Route path="ajustes" element={<ShopSettings />} />
                  </Route>
                  <Route path="migrar" element={<Migration />} />
                  <Route path="envios" element={<Shipping />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>

      <Toaster 
        position="top-center" 
        richColors 
        duration={1500}
        toastOptions={{
          style: {
            width: "fit-content",
            minWidth: "auto",
            display: "flex",
            justifyContent: "center",
            margin: "0 auto",
            padding: "10px 20px",
            fontSize: "16px",
            fontWeight: "bold",
          },
          classNames: {
            toast: "justify-center shadow-xl", 
            title: "text-center",
          }
        }}
      />
    </CartProvider>
  );
}
