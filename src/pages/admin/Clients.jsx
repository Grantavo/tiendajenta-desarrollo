import React, { useState, useEffect } from "react";
import {
  Search,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  ShoppingBag,
  Plus,
  X,
  Star,
  Trash2,
  User,
  Wallet,
  DollarSign,
  Map,
  Building2,
} from "lucide-react";

// 1. IMPORTAR SONNER PARA ALERTAS
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
} from "firebase/firestore";

export default function Clients() {
  // --- 1. DATOS ---
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar Clientes y Pedidos desde Firebase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const clientsSnap = await getDocs(collection(db, "clients"));
        const clientsData = clientsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        const ordersSnap = await getDocs(collection(db, "orders"));
        const ordersData = ordersSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setClients(clientsData);
        setOrders(ordersData);
      } catch (error) {
        console.error("Error cargando datos:", error);
        toast.error("Error al cargar la base de datos");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Estados de Interfaz
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);

  // Formulario
  const initialForm = {
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  };
  const [formData, setFormData] = useState(initialForm);

  // Formulario de recarga
  const [rechargeAmount, setRechargeAmount] = useState("");

  // Función para formatear moneda (Visual)
  const formatCurrency = (value) => {
    if (!value) return "";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Manejador del input de recarga
  const handleRechargeChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, ""); // Solo números
    if (rawValue === "") {
      setRechargeAmount("");
      return;
    }
    const numberValue = parseInt(rawValue, 10);
    setRechargeAmount(formatCurrency(numberValue));
  };

  // --- 3. CÁLCULOS ---
  const getClientStats = (phone) => {
    if (!orders || orders.length === 0)
      return { count: 0, total: 0, history: [] };

    const cleanPhone = String(phone || "").replace(/\D/g, "");

    const clientOrders = orders.filter(
      (o) => String(o.phone || "").replace(/\D/g, "") === cleanPhone,
    );

    const totalSpent = clientOrders.reduce(
      (acc, order) => acc + (Number(order.total) || 0),
      0,
    );
    return {
      count: clientOrders.length,
      total: totalSpent,
      history: clientOrders,
    };
  };

  // --- 4. FUNCIONES ---
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      return toast.warning("Campos obligatorios", {
        description: "El nombre y teléfono son necesarios.",
      });
    }

    try {
      const newClientData = {
        ...formData,
        isVip: false,
        joinDate: new Date().toISOString().split("T")[0],
        createdAt: new Date(),
        walletBalance: 0,
      };

      const docRef = await addDoc(collection(db, "clients"), newClientData);

      const savedClient = { id: docRef.id, ...newClientData };
      setClients([...clients, savedClient]);

      toast.success("Cliente registrado con éxito");
      setIsModalOpen(false);
      setFormData(initialForm);
    } catch (error) {
      console.error("Error guardando cliente:", error);
      toast.error("Error al guardar en la nube");
    }
  };

  const deleteClient = async (id) => {
    if (window.confirm("¿Eliminar cliente?")) {
      try {
        await deleteDoc(doc(db, "clients", id));
        setClients(clients.filter((c) => c.id !== id));
        setSelectedClient(null);
        toast.info("Cliente eliminado correctamente");
      } catch (error) {
        console.error("Error eliminando cliente:", error);
        toast.error("No se pudo eliminar el cliente");
      }
    }
  };

  const toggleVip = async (id) => {
    const clientIndex = clients.findIndex((c) => c.id === id);
    if (clientIndex === -1) return;

    const newVipStatus = !clients[clientIndex].isVip;

    const updatedClients = [...clients];
    updatedClients[clientIndex].isVip = newVipStatus;
    setClients(updatedClients);

    if (selectedClient && selectedClient.id === id) {
      setSelectedClient((prev) => ({ ...prev, isVip: newVipStatus }));
    }

    try {
      await updateDoc(doc(db, "clients", id), { isVip: newVipStatus });
      toast.success(
        newVipStatus ? "Cliente marcado como VIP ✨" : "Estatus VIP removido",
      );
    } catch (error) {
      console.error("Error actualizando VIP:", error);
      toast.error("Error al actualizar estatus");
    }
  };

  const handleUpdateNotes = async (id, newNotes) => {
    const updatedClients = clients.map((c) =>
      c.id === id ? { ...c, notes: newNotes } : c,
    );
    setClients(updatedClients);
    setSelectedClient((prev) => ({ ...prev, notes: newNotes }));

    try {
      await updateDoc(doc(db, "clients", id), { notes: newNotes });
    } catch (error) {
      console.error("Error guardando nota:", error);
    }
  };

  const handleRecharge = async () => {
    // Limpiamos el formato para obtener el número real
    const cleanAmount = parseInt(rechargeAmount.replace(/\D/g, ""), 10);

    if (!cleanAmount || cleanAmount <= 0) {
      return toast.error("Ingresa un monto válido");
    }

    try {
      const newBalance = (selectedClient.walletBalance || 0) + cleanAmount;

      await updateDoc(doc(db, "clients", selectedClient.id), {
        walletBalance: newBalance,
        lastRecharge: {
          amount: cleanAmount,
          date: new Date().toISOString(),
          adminId: "admin",
        },
      });

      const updatedClient = { ...selectedClient, walletBalance: newBalance };
      setSelectedClient(updatedClient);
      setClients(
        clients.map((c) => (c.id === selectedClient.id ? updatedClient : c)),
      );

      toast.success(`Recarga de $${cleanAmount.toLocaleString()} exitosa`);
      setIsRechargeOpen(false);
      setRechargeAmount("");
    } catch (error) {
      console.error("Error en recarga:", error);
      toast.error("Error al procesar la recarga");
    }
  };

  const openWhatsApp = (phone, name) => {
    const msg = `Hola ${name || "Cliente"}, te escribimos de Tienda Genta...`;
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  };

  // --- RENDER ---
  const filteredClients = clients.filter(
    (c) =>
      (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm)),
  );

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        Cargando cartera de clientes...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Cartera de Clientes
          </h1>
          <p className="text-sm text-slate-500">
            {clients.length} contactos registrados
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex flex-col md:flex-row gap-6 h-full overflow-hidden pb-2">
        <div className="w-full md:w-1/3 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 shrink-0">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Buscar cliente..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredClients.map((client) => {
              const stats = getClientStats(client.phone);
              const displayName = client.name || "Sin Nombre";
              const avatarLetter = displayName.substring(0, 2).toUpperCase();

              return (
                <div
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={`p-4 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50 ${
                    selectedClient?.id === client.id
                      ? "bg-blue-50 border-l-4 border-l-blue-600"
                      : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${
                          client.isVip ? "bg-yellow-500" : "bg-slate-400"
                        }`}
                      >
                        {avatarLetter}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm truncate max-w-[150px]">
                          {displayName}
                        </h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Phone size={10} /> {client.phone || "Sin tel"}
                        </p>
                      </div>
                    </div>
                    {client.isVip && (
                      <Star
                        size={14}
                        className="text-yellow-500 fill-yellow-500"
                      />
                    )}
                  </div>
                  <div className="mt-3 flex justify-between items-center text-xs">
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold">
                      {stats.count} Pedidos
                    </span>
                    <span className="text-green-600 font-bold">
                      ${stats.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative flex flex-col">
          {selectedClient ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* CAMBIO VISUAL: Fondo degradado claro y limpio */}
              <div className="h-40 bg-gradient-to-r from-blue-50 to-slate-100 relative">
                <button
                  onClick={() => deleteClient(selectedClient.id)}
                  className="absolute top-4 right-4 bg-white/50 text-slate-500 p-2 rounded-full hover:bg-red-500 hover:text-white transition z-10 backdrop-blur-sm"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="px-8 -mt-16 pb-6 relative z-0">
                <div className="flex justify-between items-end mb-6">
                  <div className="flex items-end gap-5">
                    <div className="w-28 h-28 bg-white rounded-full p-1.5 shadow-xl">
                      <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-4xl font-bold text-slate-400">
                        {(selectedClient.name || "?")
                          .substring(0, 2)
                          .toUpperCase()}
                      </div>
                    </div>
                    <div className="mb-3">
                      <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        {selectedClient.name || "Sin Nombre"}
                        <button
                          onClick={() => toggleVip(selectedClient.id)}
                          className={`transition ${
                            selectedClient.isVip
                              ? "text-yellow-400"
                              : "text-slate-300 hover:text-yellow-400"
                          }`}
                        >
                          <Star
                            size={24}
                            className={
                              selectedClient.isVip ? "fill-yellow-400" : ""
                            }
                          />
                        </button>
                      </h2>
                      <p className="text-sm text-slate-500 font-medium">
                        Cliente desde: {selectedClient.joinDate || "N/A"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      openWhatsApp(selectedClient.phone, selectedClient.name)
                    }
                    className="mb-4 bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-green-600/30 hover:bg-green-700 hover:-translate-y-1 transition transform flex items-center gap-2"
                  >
                    <MessageCircle size={20} />{" "}
                    <span className="hidden lg:inline">Contactar</span>
                  </button>
                </div>

                {/* SECCIÓN DE BILLETERA */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                  <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100">
                    <p className="text-xs font-bold text-green-600 uppercase mb-2 flex items-center gap-1">
                      <Wallet size={12} /> Saldo en Billetera
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-black text-green-700">
                        ${(selectedClient.walletBalance || 0).toLocaleString()}
                      </span>
                      <button
                        onClick={() => setIsRechargeOpen(true)}
                        className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-green-700 transition flex items-center gap-1 shadow-lg shadow-green-600/20"
                      >
                        <DollarSign size={16} /> Recargar
                      </button>
                    </div>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                      Total Comprado
                    </p>
                    <span className="text-2xl font-black text-slate-700">
                      $
                      {getClientStats(
                        selectedClient.phone,
                      ).total.toLocaleString()}
                    </span>
                    <p className="text-sm text-slate-500 mt-1">
                      {getClientStats(selectedClient.phone).count} pedidos
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                      Contacto
                    </p>
                    <div className="flex items-center gap-3 text-sm text-slate-700 mb-2 font-medium">
                      <div className="bg-white p-2 rounded-full shadow-sm">
                        <Phone size={14} />
                      </div>
                      {selectedClient.phone || "Sin teléfono"}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                      <div className="bg-white p-2 rounded-full shadow-sm">
                        <Mail size={14} />
                      </div>
                      {selectedClient.email || "Sin correo"}
                    </div>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                      Ubicación
                    </p>
                    <div className="flex items-center gap-3 text-sm text-slate-700 font-medium mb-2">
                      <div className="bg-white p-2 rounded-full shadow-sm">
                        <Map size={14} />
                      </div>
                      {selectedClient.department || "Sin departamento"}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                      <div className="bg-white p-2 rounded-full shadow-sm">
                        <Building2 size={14} />
                      </div>
                      {selectedClient.city || "Sin ciudad"}
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                    Dirección de Envío
                  </p>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 font-medium flex items-start gap-3">
                    <MapPin size={16} className="text-slate-400 mt-0.5" />
                    {selectedClient.address || "Sin dirección registrada"}
                  </div>
                </div>

                <div className="mb-8">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                    Notas Internas (Solo Admin)
                  </label>
                  <textarea
                    className="w-full bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 resize-none shadow-sm"
                    rows="2"
                    placeholder="Escribe aquí preferencias del cliente..."
                    value={selectedClient.notes || ""}
                    onChange={(e) =>
                      handleUpdateNotes(selectedClient.id, e.target.value)
                    }
                  ></textarea>
                </div>

                <div className="pb-8">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg">
                    <ShoppingBag size={20} className="text-blue-600" />{" "}
                    Historial de Compras
                  </h3>
                  {getClientStats(selectedClient.phone).history.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
                      <p className="text-slate-400 text-sm">
                        No hay pedidos registrados.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getClientStats(selectedClient.phone).history.map(
                        (order) => (
                          <div
                            key={order.id}
                            className="flex justify-between items-center p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition shadow-sm bg-white"
                          >
                            <div className="flex items-center gap-4">
                              <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600 font-bold">
                                #{String(order.id).slice(-4)}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-slate-400 block mb-0.5">
                                  {order.date}
                                </span>
                                <span className="text-sm font-bold text-slate-800">
                                  {order.items ? order.items.length : 0}{" "}
                                  productos
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="block font-black text-slate-800 text-lg">
                                ${Number(order.total).toLocaleString()}
                              </span>
                              <span
                                className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                                  order.status === "Entregado"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {order.status}
                              </span>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
              <div className="bg-slate-50 p-6 rounded-full mb-4">
                <User size={48} className="opacity-50" />
              </div>
              <p className="font-medium text-lg">Selecciona un cliente</p>
              <p className="text-sm opacity-70">
                Verás su historial y detalles aquí
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL NUEVO CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">
                Registrar Cliente
              </h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="text-slate-400 hover:text-red-500" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <input
                type="text"
                placeholder="Nombre Completo"
                required
                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                value={formData.name}
                onChange={(e) => {
                  const val = e.target.value;
                  const formatted = val.replace(/(^\w|\s\w)/g, (m) =>
                    m.toUpperCase(),
                  );
                  setFormData({ ...formData, name: formatted });
                }}
              />
              <input
                type="tel"
                placeholder="Teléfono (WhatsApp)"
                required
                maxLength={10}
                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                value={formData.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setFormData({ ...formData, phone: val });
                }}
              />
              <input
                type="email"
                placeholder="Correo Electrónico (Opcional)"
                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
              <textarea
                placeholder="Dirección de Envío"
                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition resize-none"
                rows="2"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              ></textarea>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
              >
                Guardar Cliente
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RECARGAR SALDO */}
      {isRechargeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <DollarSign className="text-green-600" /> Recargar Saldo
              </h2>
              <button onClick={() => setIsRechargeOpen(false)}>
                <X className="text-slate-400 hover:text-red-500" />
              </button>
            </div>
            <div className="mb-4 p-4 bg-green-50 rounded-xl border border-green-100">
              <p className="text-sm text-slate-600">Cliente:</p>
              <p className="font-bold text-slate-800">{selectedClient?.name}</p>
              <p className="text-sm text-green-600 font-bold mt-2">
                Saldo actual: $
                {(selectedClient?.walletBalance || 0).toLocaleString()}
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Monto a recargar
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="$ 0"
                    className="w-full pl-4 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-green-500 font-bold text-lg"
                    value={rechargeAmount}
                    onChange={handleRechargeChange}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[10000, 20000, 50000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setRechargeAmount(formatCurrency(amount))}
                    className="py-2 bg-slate-100 hover:bg-green-100 hover:text-green-700 rounded-xl font-bold text-sm transition"
                  >
                    +${amount.toLocaleString()}
                  </button>
                ))}
              </div>
              <button
                onClick={handleRecharge}
                disabled={
                  !rechargeAmount ||
                  parseInt(rechargeAmount.replace(/\D/g, ""), 10) <= 0
                }
                className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 transition shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar Recarga
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 10px;
        }
        /* Ocultar flechas en inputs numéricos */
        .no-spinner::-webkit-inner-spin-button,
        .no-spinner::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinner {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}
