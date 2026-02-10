import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  X,
  Copy,
} from "lucide-react";

// Importar logos de bancos
import nequiLogo from "../../assets/nequi.png";
import bancolombiaLogo from "../../assets/bancolombia.png";
import nubankLogo from "../../assets/nubank.png";

// 1. IMPORTAR SONNER Y FIREBASE
import { toast } from "sonner";
import { db } from "../../firebase/config";
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, query, where } from "firebase/firestore";

// Función para obtener el logo del banco
const getBankLogo = (type) => {
  const logos = {
    "Nequi": nequiLogo,
    "Bancolombia": bancolombiaLogo,
    "Nubank": nubankLogo
  };
  return logos[type] || null;
};

// Función segura para IDs
const generateId = () => Date.now();

export default function Payments() {
  // --- 1. ESTADOS ---
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario
  const initialForm = {
    type: "",
    accountNumber: "",
    status: "active",
    instructions: "",
  };
  const [form, setForm] = useState(initialForm);

  // --- 2. CARGAR DESDE LA COLECCIÓN paymentMethods ---
  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      try {
        const paymentsRef = collection(db, "paymentMethods");
        const snapshot = await getDocs(paymentsRef);
        
        const loadedMethods = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setPayments(loadedMethods);
        // Sincronizar con localStorage para el modal del cliente
        localStorage.setItem("shopPayments", JSON.stringify(loadedMethods));
        window.dispatchEvent(new Event("storage"));
        
        // Si no hay métodos en Firebase pero sí en localStorage, migrar
        if (loadedMethods.length === 0) {
          const localData = localStorage.getItem("shopPayments");
          if (localData) {
            try {
              const localMethods = JSON.parse(localData);
              if (localMethods.length > 0) {
                toast.info("Migrando datos antiguos...");
                // Migrar cada método a la nueva colección
                for (const method of localMethods) {
                  const { id, ...methodData } = method; // Remover el id viejo
                  await addDoc(paymentsRef, {
                    ...methodData,
                    createdAt: new Date(),
                    migratedFrom: "localStorage"
                  });
                }
                // Recargar después de migrar
                const newSnapshot = await getDocs(paymentsRef);
                const migratedMethods = newSnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
                }));
                setPayments(migratedMethods);
                localStorage.setItem("shopPayments", JSON.stringify(migratedMethods));
                toast.success("Datos migrados exitosamente");
              }
            } catch (e) {
              console.error("Error migrando datos:", e);
            }
          }
        }
      } catch (error) {
        console.error("Error cargando pagos:", error);
        toast.error("Error al conectar con la nube");
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  // --- 3. GUARDAR NUEVO MÉTODO ---
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.type || !form.accountNumber) {
      return toast.warning("Faltan datos", {
        description: "Tipo y Número de cuenta son obligatorios",
      });
    }

    try {
      const paymentsRef = collection(db, "paymentMethods");
      const docRef = await addDoc(paymentsRef, {
        ...form,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const newPayment = {
        id: docRef.id,
        ...form
      };

      const updatedList = [...payments, newPayment];
      setPayments(updatedList);
      
      // Sincronizar con localStorage
      localStorage.setItem("shopPayments", JSON.stringify(updatedList));
      window.dispatchEvent(new Event("storage"));

      toast.success("Cuenta agregada correctamente");
      setForm(initialForm);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error guardando método:", error);
      toast.error("Error al guardar el método de pago");
    }
  };

  // --- 4. ELIMINAR MÉTODO ---
  const deletePayment = async (id) => {
    if (window.confirm("¿Eliminar este método de pago?")) {
      try {
        await deleteDoc(doc(db, "paymentMethods", id));
        
        const updatedList = payments.filter((p) => p.id !== id);
        setPayments(updatedList);
        
        // Sincronizar con localStorage
        localStorage.setItem("shopPayments", JSON.stringify(updatedList));
        window.dispatchEvent(new Event("storage"));
        
        toast.info("Método de pago eliminado");
      } catch (error) {
        console.error("Error eliminando método:", error);
        toast.error("Error al eliminar el método de pago");
      }
    }
  };

  // --- 5. CAMBIAR ESTADO ---
  const toggleStatus = async (id) => {
    try {
      const payment = payments.find(p => p.id === id);
      const newStatus = payment.status === "active" ? "inactive" : "active";
      
      await updateDoc(doc(db, "paymentMethods", id), {
        status: newStatus,
        updatedAt: new Date()
      });

      const updatedList = payments.map((p) =>
        p.id === id ? { ...p, status: newStatus } : p
      );
      setPayments(updatedList);
      
      // Sincronizar con localStorage
      localStorage.setItem("shopPayments", JSON.stringify(updatedList));
      window.dispatchEvent(new Event("storage"));

      toast.success(
        newStatus === "active" ? "Cuenta Activada" : "Cuenta Pausada"
      );
    } catch (error) {
      console.error("Error actualizando estado:", error);
      toast.error("Error al actualizar el estado");
    }
  };

  // --- 6. RESETEAR TODO ---
  const resetAllData = async () => {
    if (window.confirm("⚠️ ¿Estás seguro? Esto eliminará TODOS los métodos de pago y no se puede deshacer.")) {
      try {
        // Eliminar todos los documentos de la colección
        const paymentsRef = collection(db, "paymentMethods");
        const snapshot = await getDocs(paymentsRef);
        
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        // Limpiar localStorage
        localStorage.removeItem("shopPayments");
        window.dispatchEvent(new Event("storage"));
        
        // Limpiar estado
        setPayments([]);
        toast.success("Todos los métodos de pago han sido eliminados");
      } catch (error) {
        console.error("Error reseteando datos:", error);
        toast.error("Error al resetear los datos");
      }
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-400">
        Cargando métodos de pago...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Métodos de Pago</h1>
          <p className="text-sm text-slate-500">
            Configura dónde recibirás el dinero.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <Plus size={18} /> Agregar Cuenta
        </button>
      </div>

      {/* Botón de Reset (solo visible si hay métodos) */}
      {payments.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-red-800">Zona de Peligro</p>
            <p className="text-xs text-red-600">Eliminar todos los métodos de pago</p>
          </div>
          <button
            onClick={resetAllData}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 flex items-center gap-2 text-sm"
          >
            <Trash2 size={16} /> Resetear Todo
          </button>
        </div>
      )}

      {/* LISTA DE MÉTODOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className={`bg-white rounded-2xl p-6 border transition-all ${
              payment.status === "active"
                ? "border-slate-200 shadow-sm"
                : "border-slate-100 opacity-60 bg-slate-50"
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                {getBankLogo(payment.type) ? (
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-2 shadow-sm">
                    <img 
                      src={getBankLogo(payment.type)} 
                      alt={payment.type}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white bg-slate-400">
                    {payment.type.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-800">{payment.type}</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {payment.accountNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleStatus(payment.id)}
                className={`text-xs font-bold px-2 py-1 rounded transition-colors ${
                  payment.status === "active"
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                }`}
              >
                {payment.status === "active" ? "Activo" : "Inactivo"}
              </button>
            </div>

            {payment.instructions && (
              <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 mb-4 italic border border-slate-100">
                "{payment.instructions}"
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-50">
              <button
                onClick={() => deletePayment(payment.id)}
                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        {payments.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
            No hay cuentas configuradas. Agrega tu Nequi o Bancolombia.
          </div>
        )}
      </div>

      {/* MODAL AGREGAR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                Agregar Datos Bancarios
              </h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="text-slate-400 hover:text-red-500" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Tipo (*)
                  </label>
                  <select
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    required
                  >
                    <option value="">Selecciona...</option>
                    <option value="Bancolombia">Bancolombia</option>
                    <option value="Nequi">Nequi</option>
                    <option value="Nubank">Nubank</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Estado (*)
                  </label>
                  <select
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="relative border border-slate-200 rounded-xl p-4 pt-6">
                <label className="absolute -top-3 left-3 bg-white px-2 text-xs font-bold text-slate-500 uppercase">
                  Datos de la Cuenta
                </label>

                <div className="mb-4">
                  <label className="block text-xs text-slate-400 font-bold mb-1">
                    NÚMERO DE CUENTA / CELULAR / LLAVE
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 300 123 4567 o correo@ejemplo.com"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-mono font-bold text-slate-700"
                    value={form.accountNumber}
                    onChange={(e) =>
                      setForm({ ...form, accountNumber: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1">
                    INSTRUCCIONES ADICIONALES (Opcional)
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Ej: Titular: Juan Perez. Enviar comprobante al WhatsApp."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
                    value={form.instructions}
                    onChange={(e) =>
                      setForm({ ...form, instructions: e.target.value })
                    }
                  ></textarea>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
              >
                Agregar a la Nube
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
