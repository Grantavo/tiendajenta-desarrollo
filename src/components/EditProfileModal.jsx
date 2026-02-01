import React, { useState, useEffect } from "react";
// 1. IMPORTAMOS NUEVOS ICONOS (Map, Building2)
import {
  X,
  User,
  Phone,
  MapPin,
  Save,
  Loader2,
  Mail,
  Map,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export default function EditProfileModal({ isOpen, onClose, user }) {
  const [loading, setLoading] = useState(false);

  // 2. ACTUALIZAMOS EL ESTADO CON LOS NUEVOS CAMPOS
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "", // Nuevo
    city: "", // Nuevo
    address: "",
  });

  // Cargar datos actuales
  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        department: user.department || "", // Cargar Dept
        city: user.city || "", // Cargar Ciudad
        address: user.address || "",
      });
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 3. GUARDAR EN FIREBASE
      const userRef = doc(db, "users", user.id);
      await updateDoc(userRef, {
        name: formData.name,
        email: formData.email.trim(),
        phone: formData.phone,
        department: formData.department, // Guardar Dept
        city: formData.city, // Guardar Ciudad
        address: formData.address,
      });

      // 4. ACTUALIZAR SESIÓN LOCAL
      const updatedUser = { ...user, ...formData };
      sessionStorage.setItem("shopUser", JSON.stringify(updatedUser));

      toast.success("Perfil actualizado correctamente");
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast.error("Error al actualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <User className="text-purple-600" /> Editar Mis Datos
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors shadow-sm"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nombre */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">
              Nombre Completo
            </label>
            <div className="relative">
              <User
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 font-medium text-slate-700"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 font-medium text-slate-700"
              />
            </div>
          </div>

          {/* Celular */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">
              Celular / WhatsApp
            </label>
            <div className="relative">
              <Phone
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 font-medium text-slate-700"
              />
            </div>
          </div>

          {/* 5. NUEVOS CAMPOS: DEPARTAMENTO Y CIUDAD (EN DOBLE COLUMNA) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                Departamento
              </label>
              <div className="relative">
                <Map
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  required
                  placeholder="Ej: Nariño"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 font-medium text-slate-700"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                Ciudad
              </label>
              <div className="relative">
                <Building2
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  required
                  placeholder="Ej: Pasto"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 font-medium text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">
              Dirección Exacta
            </label>
            <div className="relative">
              <MapPin
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Ej: Calle 123 # 45 - 67, Apto 101"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 font-medium text-slate-700"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white font-bold py-3.5 rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Guardar Cambios"
              )}
              {!loading && <Save size={18} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
