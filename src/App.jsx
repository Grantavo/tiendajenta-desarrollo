import { BrowserRouter, Routes, Route } from "react-router-dom";
// 1. IMPORTAMOS LAS HERRAMIENTAS DE OPTIMIZACIÓN DE REACT
import { lazy, Suspense } from "react";
import { Toaster } from "sonner";

// 2. IMPORTAMOS TU SPINNER (Lo usaremos mientras cargan las páginas pesadas)
import LoadingSpinner from "./components/LoadingSpinner";

// --- IMPORTACIONES ESTÁTICAS (CRÍTICAS) ---
// Estas se cargan al instante para dar estructura visual inmediata.
import ShopLayout from "./layouts/ShopLayout";
import Login from "./pages/auth/Login";
import ProtectedRoute from "./pages/auth/ProtectedRoute";
import { CartProvider } from "./context/CartContext";

// --- IMPORTACIONES PEREZOSAS (LAZY LOADING) ---
// Estas páginas SOLO se descargarán cuando el usuario intente visitarlas.
// Esto reduce drásticamente el peso inicial de 'jenta.online'.

// 1. Layout del Admin (Contiene librerías pesadas, lo aislamos)
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));

// 2. Páginas de la Tienda
const Home = lazy(() => import("./pages/Home"));
const CategoryPage = lazy(() => import("./pages/shop/CategoryPage"));
const ProductDetail = lazy(() => import("./pages/shop/ProductDetail"));
const ShopProducts = lazy(() => import("./pages/shop/Products"));
const ClientDashboard = lazy(() => import("./pages/shop/ClientDashboard"));

// 3. Páginas del Admin (Dashboard, Gráficos, Excel - Todo esto pesa mucho)
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const ShopSettings = lazy(() => import("./pages/admin/ShopSettings"));
const Categories = lazy(() => import("./pages/admin/Categories"));
const Products = lazy(() => import("./pages/admin/Products"));
const Orders = lazy(() => import("./pages/admin/Orders"));
const Banners = lazy(() => import("./pages/admin/Banners"));
const Clients = lazy(() => import("./pages/admin/Clients"));
const Users = lazy(() => import("./pages/admin/Users"));
const Marketing = lazy(() => import("./pages/admin/Marketing"));
const Payments = lazy(() => import("./pages/admin/Payments"));
const Shipping = lazy(() => import("./pages/admin/Shipping"));
const Migration = lazy(() => import("./pages/admin/Migration"));

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        {/* ENVOLVEMOS LAS RUTAS EN SUSPENSE 
          fallback={<LoadingSpinner fullScreen />} -> Muestra tu spinner pantalla completa
          mientras llega el código de la página solicitada.
        */}
        <Suspense fallback={<LoadingSpinner fullScreen />}>
          <Routes>
            {/* RUTA LOGIN (Pública - Carga rápida estática) */}
            <Route path="/login" element={<Login />} />

            {/* TIENDA (Pública) */}
            {/* ShopLayout es estático, pero sus hijos (Home, etc.) son dinámicos */}
            <Route path="/" element={<ShopLayout />}>
              <Route index element={<Home />} />
              <Route path="categoria/:id" element={<CategoryPage />} />
              <Route path="producto/:id" element={<ProductDetail />} />
              <Route path="productos" element={<ShopProducts />} />
              <Route path="perfil" element={<ClientDashboard />} />
            </Route>

            {/* --- ZONA BLINDADA (ADMIN) --- */}
            {/* Toda esta sección ahora se descarga APARTE, solo si tienes permiso */}
            <Route element={<ProtectedRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                {/* Dashboard */}
                <Route index element={<Dashboard />} />

                {/* Módulos protegidos */}
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
                  <Route path="ajustes" element={<ShopSettings />} />
                </Route>

                <Route path="migrar" element={<Migration />} />

                <Route path="envios" element={<Shipping />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
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
