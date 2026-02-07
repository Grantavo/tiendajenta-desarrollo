import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Edit2, Shield, Check, X, Key, Lock, Search } from "lucide-react";

// 1. IMPORTAR SONNER
import { toast } from "sonner";

// IMPORTAR FIREBASE
import { db } from "../../firebase/config";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore";

// --- ZONA SEGURA (CONSTANTES) ---
const getTodayDate = () => new Date().toISOString().split("T")[0];

const APP_MODULES = [
  { id: "dashboard", label: "Dashboard (Ver Métricas)" },
  { id: "pedidos", label: "Gestión de Pedidos" },
  { id: "productos", label: "Gestión de Productos" },
  { id: "categorias", label: "Gestión de Categorías" },
  { id: "clientes", label: "Cartera de Clientes" },
  { id: "banners", label: "Diseño y Banners" },
  { id: "usuarios", label: "Gestión de Usuarios (Peligroso)" },
  { id: "ajustes", label: "Configuración de Tienda" },
];

const SUPER_ADMIN_ROLE_DATA = {
  name: "Administrador del sistema",
  permissions: APP_MODULES.map((m) => m.id),
  isSystem: true,
};
const SUPER_ADMIN_ID = "super_admin";

const DEFAULT_ADMIN_USER = {
  name: "Admin Principal",
  email: "admin@admin.com",
  password: "123",
  roleId: SUPER_ADMIN_ID,
  createdAt: getTodayDate(),
  isSystem: true,
};

export default function Users() {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. CARGAR DATOS (Corregido: sin dependencias externas)
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Definimos las referencias DENTRO para que useCallback no pida dependencias
      const usersRef = collection(db, "users");
      const rolesRef = collection(db, "roles");

      const [usersSnap, rolesSnap] = await Promise.all([
        getDocs(usersRef),
        getDocs(rolesRef),
      ]);

      let usersData = usersSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      let rolesData = rolesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // A. ASEGURAR ROL SUPER ADMIN
      const adminExists = rolesData.find((r) => r.id === SUPER_ADMIN_ID);

      if (!adminExists) {
        console.log("⚠️ Rol Super Admin no encontrado. Creándolo...");
        await setDoc(doc(db, "roles", SUPER_ADMIN_ID), SUPER_ADMIN_ROLE_DATA);
        rolesData.unshift({ id: SUPER_ADMIN_ID, ...SUPER_ADMIN_ROLE_DATA });
      } else {
        const allPermissions = APP_MODULES.map((m) => m.id);
        // Validamos si permissions existe antes de ordenar para evitar errores
        const currentPerms = adminExists.permissions || [];

        if (
          JSON.stringify(currentPerms.sort()) !==
          JSON.stringify(allPermissions.sort())
        ) {
          await updateDoc(doc(db, "roles", SUPER_ADMIN_ID), {
            permissions: allPermissions,
          });
          rolesData = rolesData.map((r) =>
            r.id === SUPER_ADMIN_ID ? { ...r, permissions: allPermissions } : r
          );
        }
      }

      // B. ASEGURAR USUARIO MAESTRO
      if (usersData.length === 0) {
        console.log("⚠️ BD vacía. Creando usuario por defecto...");
        const newUserRef = await addDoc(usersRef, DEFAULT_ADMIN_USER);
        usersData.push({ id: newUserRef.id, ...DEFAULT_ADMIN_USER });

        // REEMPLAZO DE ALERT
        toast.success("Usuario Maestro Creado", {
          description: `Email: ${DEFAULT_ADMIN_USER.email} | Pass: ${DEFAULT_ADMIN_USER.password}`,
          duration: 10000, // Duración extra para que alcancen a leer
        });
      }

      // Ordenar roles
      rolesData.sort((a, b) => (b.isSystem === true) - (a.isSystem === true));

      setUsers(usersData);
      setRoles(rolesData);

      localStorage.setItem("shopRoles", JSON.stringify(rolesData));
      localStorage.setItem("shopUsers", JSON.stringify(usersData));
    } catch (error) {
      console.error("Error cargando datos:", error);
      toast.error("Error cargando la base de datos");
    } finally {
      setLoading(false);
    }
  }, []); // Array vacío = No depende de nada externo

  useEffect(() => {
    fetchData();
  }, [fetchData]); // fetchData es estable gracias a useCallback

  // --- ESTADOS VISUALES ---
  const [activeTab, setActiveTab] = useState("users");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const initialUserForm = { name: "", email: "", password: "", roleId: "" };
  const initialRoleForm = { name: "", permissions: [] };

  const [userForm, setUserForm] = useState(initialUserForm);
  const [roleForm, setRoleForm] = useState(initialRoleForm);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const filteredUsers = users.filter((u) => {
     const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           u.email.toLowerCase().includes(searchTerm.toLowerCase());
     const matchesRole = roleFilter ? u.roleId === roleFilter : true;
     return matchesSearch && matchesRole;
  });

  // --- LÓGICA USUARIOS ---
  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      const userData = {
        name: userForm.name,
        email: userForm.email,
        roleId: userForm.roleId,
        ...(userForm.password ? { password: userForm.password } : {}),
        updatedAt: new Date(),
      };

      if (editingId) {
        const userRef = doc(db, "users", editingId);
        await updateDoc(userRef, userData);
        toast.success("Usuario actualizado ✅");
      } else {
        if (!userForm.password) {
          toast.warning("La contraseña es obligatoria");
          return;
        }
        await addDoc(collection(db, "users"), {
          // Usamos collection directo
          ...userData,
          createdAt: getTodayDate(),
          isSystem: false,
        });
        toast.success("Usuario creado exitosamente 🚀");
      }
      closeModal();
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al guardar usuario");
    }
  };

  const deleteUser = async (id) => {
    const userToDelete = users.find((u) => u.id === id);
    // Verificamos el rol para ver si es del sistema
    const userRole = roles.find((r) => r.id === userToDelete?.roleId);

    if (userRole?.isSystem) {
      toast.error("No puedes eliminar a un usuario con rol de Sistema.");
      return;
    }

    if (
      window.confirm("¿Eliminar usuario? Perderá el acceso inmediatamente.")
    ) {
      try {
        await deleteDoc(doc(db, "users", id));
        fetchData();
        toast.info("Usuario eliminado");
      } catch (error) {
        console.error("Error eliminando:", error);
        toast.error("No se pudo eliminar");
      }
    }
  };

  // --- LÓGICA ROLES ---
  const handleSaveRole = async (e) => {
    e.preventDefault();
    try {
      const roleData = {
        name: roleForm.name,
        permissions: roleForm.permissions,
      };
      if (editingId) {
        const roleRef = doc(db, "roles", editingId);
        await updateDoc(roleRef, roleData);
        toast.success("Rol actualizado ✅");
      } else {
        await addDoc(collection(db, "roles"), {
          // Usamos collection directo
          ...roleData,
          isSystem: false,
        });
        toast.success("Rol creado exitosamente 🚀");
      }
      closeModal();
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al guardar rol");
    }
  };

  const deleteRole = async (id) => {
    const roleToDelete = roles.find((r) => r.id === id);
    if (roleToDelete?.isSystem) {
      toast.error("Este rol es vital para el sistema. No se puede borrar.");
      return;
    }

    const usersInRole = users.filter((u) => u.roleId === id);
    if (usersInRole.length > 0) {
      toast.warning(
        `No puedes borrar este rol porque hay ${usersInRole.length} usuarios usándolo.`
      );
      return;
    }

    if (window.confirm("¿Eliminar Rol de la nube?")) {
      try {
        await deleteDoc(doc(db, "roles", id));
        fetchData();
        toast.info("Rol eliminado");
      } catch (error) {
        console.error("Error eliminando rol:", error);
        toast.error("Error al eliminar rol");
      }
    }
  };

  const togglePermission = (moduleId) => {
    const currentPerms = roleForm.permissions;
    if (currentPerms.includes(moduleId)) {
      setRoleForm({
        ...roleForm,
        permissions: currentPerms.filter((p) => p !== moduleId),
      });
    } else {
      setRoleForm({ ...roleForm, permissions: [...currentPerms, moduleId] });
    }
  };

  // --- UI HELPERS ---
  const openEditUser = (user) => {
    setUserForm({
      name: user.name,
      email: user.email,
      password: "",
      roleId: user.roleId,
    });
    setEditingId(user.id);
    setActiveTab("users");
    setIsModalOpen(true);
  };

  const openEditRole = (role) => {
    if (role.isSystem) {
      toast.info(
        "El rol de Sistema tiene permisos automáticos y no debe editarse manualmente."
      );
      return;
    }
    setRoleForm({ name: role.name, permissions: role.permissions });
    setEditingId(role.id);
    setActiveTab("roles");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setUserForm(initialUserForm);
    setRoleForm(initialRoleForm);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        Cargando gestión de acceso...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Gestión de Acceso
          </h1>
          <p className="text-sm text-slate-500">
            Administra tu equipo de trabajo.
          </p>
        </div>
        <div className="flex flex-col md:flex-row bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
          <button
            onClick={() => setActiveTab("users")}
            className={`w-full md:w-auto px-4 py-3 md:py-2 rounded-md text-sm font-bold transition ${
              activeTab === "users"
                ? "bg-blue-100 text-blue-700"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Usuarios ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("roles")}
            className={`w-full md:w-auto px-4 py-3 md:py-2 rounded-md text-sm font-bold transition ${
              activeTab === "roles"
                ? "bg-blue-100 text-blue-700"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Roles y Permisos ({roles.length})
          </button>
        </div>
        <button
          onClick={() => {
            setIsModalOpen(true);
            setEditingId(null);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 flex items-center gap-2"
        >
          <Plus size={18} />{" "}
          {activeTab === "users" ? "Agregar Usuario" : "Crear Rol"}
        </button>
      </div>

      {/* --- TABLA DE USUARIOS --- */}
      {activeTab === "users" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* FILTROS Y BUSCADOR */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4">
             <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre o correo..." 
                  className="w-full pl-10 pr-4 py-3 md:py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <div className="w-full md:w-48">
                <select 
                  className="w-full h-full p-3 md:p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none focus:border-blue-500"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                   <option value="">Todos los Roles</option>
                   {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                   ))}
                </select>
             </div>
          </div>

          {/* VISTA ESCRITORIO (TABLA) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500">
                <tr>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Rol Asignado</th>
                  <th className="px-6 py-4">Fecha Creación</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                   <tr>
                      <td colSpan="4" className="text-center py-8 text-slate-400 italic">
                         No se encontraron usuarios.
                      </td>
                   </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const userRole = roles.find((r) => r.id === user.roleId);
                    const isSystemRole = userRole?.isSystem;
                    return (
                      <tr key={user.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                isSystemRole
                                  ? "bg-green-100 text-green-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {user.name
                                ? user.name.substring(0, 2).toUpperCase()
                                : "??"}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">
                                {user.name}
                              </p>
                              <p className="text-xs text-slate-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold border ${
                              isSystemRole
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {userRole?.name || "Rol desconocido"}
                          </span>
                        </td>
                        <td className="px-6 py-4">{user.createdAt || "N/A"}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => openEditUser(user)}
                            className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition"
                          >
                            <Edit2 size={18} />
                          </button>
                          {!isSystemRole ? (
                            <button
                              onClick={() => deleteUser(user.id)}
                              className="text-red-400 hover:bg-red-50 p-2 rounded-full transition"
                            >
                              <Trash2 size={18} />
                            </button>
                          ) : (
                            <button
                              title="Protegido por Rol de Sistema"
                              className="text-slate-300 cursor-not-allowed p-2"
                            >
                              <Lock size={18} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* VISTA MÓVIL (CARDS) */}
          <div className="md:hidden flex flex-col divide-y divide-slate-100">
             {filteredUsers.length === 0 ? (
                <div className="text-center py-10 text-slate-400 italic">
                   No se encontraron usuarios.
                </div>
             ) : (
                filteredUsers.map(user => {
                   const userRole = roles.find((r) => r.id === user.roleId);
                   const isSystemRole = userRole?.isSystem;
                   
                   return (
                      <div key={user.id} className="p-4 flex items-start gap-3">
                         <div
                              className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-lg ${
                                isSystemRole
                                  ? "bg-green-100 text-green-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {user.name
                                ? user.name.substring(0, 2).toUpperCase()
                                : "??"}
                          </div>
                          <div className="flex-1 min-w-0">
                             <div className="flex justify-between items-start">
                                <div>
                                   <h3 className="font-bold text-slate-800 truncate">{user.name}</h3>
                                   <p className="text-xs text-slate-500 truncate mb-1">{user.email}</p>
                                </div>
                                {isSystemRole && <Lock size={14} className="text-green-600 mt-1" />}
                             </div>
                             
                             <div className="flex items-center gap-2 mb-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    isSystemRole
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : "bg-blue-50 text-blue-700 border-blue-200"
                                  }`}
                                >
                                  {userRole?.name || "Rol desconocido"}
                                </span>
                                <span className="text-[10px] text-slate-400">{user.createdAt || "N/A"}</span>
                             </div>

                             <div className="flex gap-2">
                                <button 
                                   onClick={() => openEditUser(user)}
                                   className="flex-1 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition"
                                >
                                   <Edit2 size={14} /> Editar
                                </button>
                                {!isSystemRole && (
                                   <button 
                                      onClick={() => deleteUser(user.id)}
                                      className="flex-1 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition"
                                   >
                                      <Trash2 size={14} /> Eliminar
                                   </button>
                                )}
                             </div>
                          </div>
                      </div>
                   )
                })
             )}
          </div>
        </div>
      )}

      {/* --- TABLA DE ROLES --- */}
      {activeTab === "roles" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div
              key={role.id}
              className={`bg-white rounded-xl shadow-sm border p-6 flex flex-col relative group ${
                role.isSystem ? "border-green-200" : "border-slate-200"
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <Shield
                    size={20}
                    className={
                      role.isSystem ? "text-green-600" : "text-blue-600"
                    }
                  />
                  <h3
                    className={`font-bold text-lg ${
                      role.isSystem ? "text-green-800" : "text-slate-800"
                    }`}
                  >
                    {role.name}
                  </h3>
                </div>
                {!role.isSystem && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditRole(role)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => deleteRole(role.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
                {role.isSystem && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                    <Lock size={12} /> Sistema
                  </span>
                )}
              </div>

              <p className="text-xs font-bold text-slate-400 uppercase mb-3">
                Permisos Habilitados:
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {role.isSystem ? (
                  <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded font-bold w-full text-center">
                    ✨ Acceso Total a la Configuración
                  </span>
                ) : (
                  role.permissions &&
                  role.permissions.map((perm) => {
                    const mod = APP_MODULES.find((m) => m.id === perm);
                    return (
                      <span
                        key={perm}
                        className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded"
                      >
                        {mod ? mod.label.split("(")[0] : perm}
                      </span>
                    );
                  })
                )}
              </div>

              <div className="mt-auto pt-4 border-t border-slate-50 text-xs text-slate-400 flex justify-between">
                <span>Usuarios con este rol:</span>
                <span className="font-bold text-slate-700">
                  {users.filter((u) => u.roleId === role.id).length}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                {activeTab === "users"
                  ? editingId
                    ? "Editar Usuario"
                    : "Nuevo Usuario"
                  : editingId
                  ? "Editar Rol"
                  : "Crear Nuevo Rol"}
              </h2>
              <button onClick={closeModal}>
                <X className="text-slate-400 hover:text-red-500" />
              </button>
            </div>

            {activeTab === "users" && (
              <form onSubmit={handleSaveUser} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                    value={userForm.name}
                    onChange={(e) =>
                      setUserForm({ ...userForm, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Correo (Login)
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                    value={userForm.email}
                    onChange={(e) =>
                      setUserForm({ ...userForm, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Rol de Acceso
                  </label>
                  <select
                    required
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white"
                    value={userForm.roleId}
                    onChange={(e) =>
                      setUserForm({ ...userForm, roleId: e.target.value })
                    }
                  >
                    <option value="">Seleccione un rol...</option>
                    {roles.map((r) => (
                      <option
                        key={r.id}
                        value={r.id}
                        className={r.isSystem ? "font-bold text-green-700" : ""}
                      >
                        {r.name} {r.isSystem ? "(Sistema)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                    Contraseña{" "}
                    {editingId && (
                      <span className="text-slate-400 font-normal lowercase">
                        (Dejar vacía para no cambiar)
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Key
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <input
                      type="password"
                      className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                      placeholder="******"
                      value={userForm.password}
                      onChange={(e) =>
                        setUserForm({ ...userForm, password: e.target.value })
                      }
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition mt-2"
                >
                  Guardar Usuario
                </button>
              </form>
            )}

            {activeTab === "roles" && (
              <form onSubmit={handleSaveRole} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Nombre del Rol
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Vendedor, Logística..."
                    required
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                    value={roleForm.name}
                    onChange={(e) =>
                      setRoleForm({ ...roleForm, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                    Permisos de Acceso
                  </label>
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto custom-scrollbar border border-slate-100 p-2 rounded-xl">
                    {APP_MODULES.map((module) => (
                      <label
                        key={module.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                          roleForm.permissions.includes(module.id)
                            ? "bg-blue-50 border-blue-200"
                            : "bg-white border-slate-100 hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center border ${
                            roleForm.permissions.includes(module.id)
                              ? "bg-blue-600 border-blue-600"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {roleForm.permissions.includes(module.id) && (
                            <Check size={14} className="text-white" />
                          )}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={roleForm.permissions.includes(module.id)}
                          onChange={() => togglePermission(module.id)}
                        />
                        <span
                          className={`text-sm ${
                            roleForm.permissions.includes(module.id)
                              ? "font-bold text-blue-900"
                              : "text-slate-600"
                          }`}
                        >
                          {module.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition mt-2"
                >
                  Guardar Configuración del Rol
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}
