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

// 1. IMPORTAR SONNER Y FIREBASE
import { toast } from "sonner";
import { db } from "../../firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";

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

  // --- 2. CARGAR DESDE LA NUBE (FIREBASE) ---
  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "settings", "payments");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setPayments(docSnap.data().methods || []);
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

  // --- 3. GUARDAR EN LA NUBE ---
  const saveToCloud = async (newMethodsList) => {
    try {
      await setDoc(doc(db, "settings", "payments"), {
        methods: newMethodsList,
        updatedAt: new Date(),
      });
      // Sincronizar localmente para reactividad inmediata
      localStorage.setItem("shopPayments", JSON.stringify(newMethodsList));
      window.dispatchEvent(new Event("storage"));
    } catch (error) {
      console.error("Error guardando pagos:", error);
      toast.error("No se pudo sincronizar con la nube");
    }
  };

  // --- 4. FUNCIONES ---
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.type || !form.accountNumber) {
      return toast.warning("Faltan datos", {
        description: "Tipo y Número de cuenta son obligatorios",
      });
    }

    const newPayment = {
      ...form,
      id: generateId(),
    };

    const updatedList = [...payments, newPayment];
    setPayments(updatedList);
    await saveToCloud(updatedList);

    toast.success("Cuenta agregada correctamente");
    setForm(initialForm);
    setIsModalOpen(false);
  };

  const deletePayment = async (id) => {
    if (window.confirm("¿Eliminar este método de pago?")) {
      const updatedList = payments.filter((p) => p.id !== id);
      setPayments(updatedList);
      await saveToCloud(updatedList);
      toast.info("Método de pago eliminado");
    }
  };

  const toggleStatus = async (id) => {
    const updatedList = payments.map((p) =>
      p.id === id
        ? { ...p, status: p.status === "active" ? "inactive" : "active" }
        : p
    );
    setPayments(updatedList);
    await saveToCloud(updatedList);

    const target = updatedList.find((p) => p.id === id);
    toast.success(
      target.status === "active" ? "Cuenta Activada" : "Cuenta Pausada"
    );
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
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                    payment.type === "Nequi"
                      ? "bg-purple-900"
                      : "bg-yellow-400 text-black"
                  }`}
                >
                  {payment.type === "Nequi" ? "N" : "B"}
                </div>
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
                    NÚMERO DE CUENTA / CELULAR
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 300 123 4567"
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
