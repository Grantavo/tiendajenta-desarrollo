import React from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute({ module }) {
  // 1. Recuperar sesión y roles
  const userStr = sessionStorage.getItem("shopUser");
  const rolesStr = localStorage.getItem("shopRoles");

  // MEJORA: Validación de existencia inmediata para evitar errores de parseo
  if (!userStr || !rolesStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    const allRoles = JSON.parse(rolesStr);

    // 2. Validación de integridad
    if (!user?.id || !user?.roleId) {
      throw new Error("Sesión incompleta");
    }

    // 3. LÓGICA DE PERMISOS
    const userRole = allRoles.find((r) => r.id === user.roleId);

    // Si el rol es "isSystem" (Super Admin), pasa directo
    if (userRole?.isSystem) {
      return <Outlet />;
    }

    // 4. VALIDACIÓN POR MÓDULO
    if (module) {
      const hasPermission = userRole?.permissions?.includes(module);

      if (!hasPermission) {
        console.warn(`Acceso denegado al módulo: ${module}`);
        return <Navigate to="/admin" replace />;
      }
    }

    // Todo OK
    return <Outlet />;
  } catch (error) {
    // MEJORA: Si el JSON está mal formado o algo falla, limpiamos para evitar bucles de error
    console.error("Error en validación de seguridad:", error);
    sessionStorage.removeItem("shopUser");
    return <Navigate to="/login" replace />;
  }
}
