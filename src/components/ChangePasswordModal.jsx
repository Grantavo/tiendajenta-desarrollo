import React, { useState } from "react";
import { X, Lock, Save, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export default function ChangePasswordModal({ isOpen, onClose, user }) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Validaciones Locales
    if (formData.currentPassword !== user.password) {
      toast.error("La contraseña actual es incorrecta");
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.warning("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Las nuevas contraseñas no coinciden");
      return;
    }

    if (formData.newPassword === formData.currentPassword) {
      toast.info("La nueva contraseña es igual a la actual");
      return;
    }

    setLoading(true);

    try {
      // 2. Actualizar en Firebase
      const userRef = doc(db, "users", user.id);
      await updateDoc(userRef, {
        password: formData.newPassword,
      });

      // 3. Actualizar Sesión Local
      // Es importante actualizar la sesión para que si vuelve a abrir el modal,
      // la validación de "contraseña actual" funcione con la nueva.
      const updatedUser = { ...user, password: formData.newPassword };
      sessionStorage.setItem("shopUser", JSON.stringify(updatedUser));

      toast.success("Contraseña actualizada con éxito");
      onClose();

      // Limpiar formulario
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Error cambiando contraseña:", error);
      toast.error("Error al actualizar. Intenta nuevamente.");
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
            <Lock className="text-orange-600" /> Seguridad
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
          {/* Contraseña Actual */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">
              Contraseña Actual
            </label>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={formData.currentPassword}
                onChange={(e) =>
                  setFormData({ ...formData, currentPassword: e.target.value })
                }
                className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium text-slate-700"
                placeholder="••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="h-px bg-slate-100 my-2" />

          {/* Nueva Contraseña */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">
              Nueva Contraseña
            </label>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={formData.newPassword}
                onChange={(e) =>
                  setFormData({ ...formData, newPassword: e.target.value })
                }
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium text-slate-700"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>

          {/* Confirmar Nueva Contraseña */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">
              Confirmar Nueva
            </label>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium text-slate-700"
                placeholder="Repite la contraseña"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white font-bold py-3.5 rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Actualizar Contraseña"
              )}
              {!loading && <Save size={18} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
