import { useMemo, useCallback } from "react";

export const usePermissions = () => {
  // 1. Obtenemos el usuario de la sesión actual
  const user = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("shopUser") || "{}");
    } catch {
      return {};
    }
  }, []);

  // 2. Obtenemos la lista de roles que guardas en localStorage (desde Users.jsx)
  const allRoles = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("shopRoles") || "[]");
    } catch {
      return [];
    }
  }, []);

  // 3. Buscamos el rol específico que tiene asignado el usuario logueado
  const userRole = useMemo(() => {
    return allRoles.find((r) => r.id === user.roleId);
  }, [user.roleId, allRoles]);

  /**
   * Función para verificar si el usuario tiene acceso a un módulo
   * @param {string} moduleId - El ID del módulo (ej: 'productos', 'usuarios', 'pedidos')
   */
  const hasPermission = useCallback(
    (moduleId) => {
      // REGLA DE ORO: Si el rol está marcado como 'isSystem' (Super Admin), tiene permiso para TODO.
      if (userRole?.isSystem) return true;

      // Si no es Super Admin, verificamos si el moduleId existe en su lista de permisos.
      return userRole?.permissions?.includes(moduleId) || false;
    },
    [userRole]
  );

  return {
    hasPermission,
    userRole,
    userPermissions: userRole?.permissions || [],
  };
};
