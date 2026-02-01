import { BrowserRouter, Routes, Route } from "react-router-dom";
// 1. IMPORTAR EL COMPONENTE DE NOTIFICACIONES
import { Toaster } from "sonner";

// Layouts
import ShopLayout from "./layouts/ShopLayout";
import AdminLayout from "./layouts/AdminLayout";

// Guardián de Seguridad (Protección de Rutas)
import ProtectedRoute from "./pages/auth/ProtectedRoute";

// Páginas de Autenticación
import Login from "./pages/auth/Login";

// Páginas Tienda (Públicas)
import Home from "./pages/Home";
import CategoryPage from "./pages/shop/CategoryPage";
import ProductDetail from "./pages/shop/ProductDetail";
import ShopProducts from "./pages/shop/Products";

// Páginas Admin (Privadas)
import Dashboard from "./pages/admin/Dashboard";
import ShopSettings from "./pages/admin/ShopSettings";
import Categories from "./pages/admin/Categories";
import Products from "./pages/admin/Products";
import Orders from "./pages/admin/Orders";
import Banners from "./pages/admin/Banners";
import Clients from "./pages/admin/Clients";
import Users from "./pages/admin/Users";
import Marketing from "./pages/admin/Marketing";
import Payments from "./pages/admin/Payments";
import Migration from "./pages/admin/Migration";

// Contexto Global
import { CartProvider } from "./context/CartContext";

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          {/* RUTA LOGIN (Pública) */}
          <Route path="/login" element={<Login />} />

          {/* TIENDA (Pública) */}
          <Route path="/" element={<ShopLayout />}>
            <Route index element={<Home />} />
            <Route path="categoria/:id" element={<CategoryPage />} />
            <Route path="producto/:id" element={<ProductDetail />} />
            <Route path="productos" element={<ShopProducts />} />
          </Route>

          {/* --- ZONA BLINDADA (ADMIN) --- */}
          {/* Este primer ProtectedRoute sin 'module' solo verifica que exista sesión */}
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              {/* Dashboard: Acceso permitido para cualquier usuario logueado */}
              <Route index element={<Dashboard />} />

              {/* Módulos con protección individual según el rol */}
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

              {/* Ajustes y Pagos comparten el permiso de 'ajustes' */}
              <Route element={<ProtectedRoute module="ajustes" />}>
                <Route path="pagos" element={<Payments />} />
                <Route path="ajustes" element={<ShopSettings />} />
              </Route>

              {/* Herramientas adicionales */}
              <Route path="migrar" element={<Migration />} />

              <Route
                path="envios"
                element={<h1 className="p-8">Envíos (Próximamente)</h1>}
              />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>

      {/* 2. COMPONENTE GLOBAL DE NOTIFICACIONES */}
      <Toaster position="top-center" richColors />
    </CartProvider>
  );
}
