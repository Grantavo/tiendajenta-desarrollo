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
  TrendingUp,
} from "lucide-react";

import { toast } from "sonner";
import { db } from "../../firebase/config";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubClients = onSnapshot(
      collection(db, "clients"),
      (snap) => {
        setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false),
    );

    const unsubOrders = onSnapshot(collection(db, "orders"), (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubClients();
      unsubOrders();
    };
  }, []);

  // Sync selectedClient with realtime data
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClientId, setSelectedClientId] = useState(null);
  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [transactionType, setTransactionType] = useState("deposit"); // "deposit" | "withdrawal"
  const [walletType, setWalletType] = useState("main"); // "main" | "investment"

  const initialForm = {
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  };
  const [formData, setFormData] = useState(initialForm);
  const [rechargeAmount, setRechargeAmount] = useState("");

  const formatCurrency = (value) => {
    if (!value) return "";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleRechargeChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (rawValue === "") {
      setRechargeAmount("");
      return;
    }
    setRechargeAmount(formatCurrency(parseInt(rawValue, 10)));
  };

  const getClientStats = (phone) => {
    if (!orders.length) return { count: 0, total: 0, history: [] };
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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone)
      return toast.warning("Campos obligatorios");
    try {
      await addDoc(collection(db, "clients"), {
        ...formData,
        isVip: false,
        joinDate: new Date().toISOString().split("T")[0],
        createdAt: new Date(),
        balance: 0,
      });
      toast.success("Cliente registrado");
      setIsModalOpen(false);
      setFormData(initialForm);
    } catch {
      toast.error("Error al guardar");
    }
  };

  const deleteClient = async (id) => {
    if (window.confirm("¿Eliminar cliente?")) {
      try {
        await deleteDoc(doc(db, "clients", id));
        if (selectedClientId === id) setSelectedClientId(null);
        toast.info("Cliente eliminado");
      } catch {
        toast.error("Error al eliminar");
      }
    }
  };

  const toggleVip = async (id) => {
    const client = clients.find((c) => c.id === id);
    if (!client) return;
    try {
      await updateDoc(doc(db, "clients", id), { isVip: !client.isVip });
      toast.success("Estatus actualizado");
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const handleUpdateNotes = async (id, newNotes) => {
    try {
      await updateDoc(doc(db, "clients", id), { notes: newNotes });
    } catch {
      /* silenciado */
    }
  };

  const handleRecharge = async () => {
    const cleanAmount = parseInt(rechargeAmount.replace(/\D/g, ""), 10);
    if (!cleanAmount || cleanAmount <= 0) return toast.error("Monto inválido");
    if (!selectedClient) return;
    
    try {
      // Sanitize current balance (handle strings like "20.000")
      const currentBalanceRaw = String(
          walletType === 'investment' 
          ? (selectedClient.investmentBalance || "0") 
          : (selectedClient.balance || "0")
      );
      const currentBalanceClean = currentBalanceRaw.replace(/[.,]/g, "");
      let newBalance = Number(currentBalanceClean) || 0;
      
      if (transactionType === "withdrawal") {
        if (newBalance < cleanAmount) {
          return toast.error("Saldo insuficiente para realizar el descuento");
        }
        newBalance -= cleanAmount;
      } else {
        newBalance += cleanAmount;
      }

      const updateData = {};
      if (walletType === 'investment') {
          updateData.investmentBalance = newBalance;
          updateData.lastInvestmentRecharge = {
              type: transactionType,
              amount: cleanAmount,
              date: new Date().toISOString(),
              adminId: "admin",
          };
      } else {
          updateData.balance = newBalance;
          updateData.lastRecharge = {
              type: transactionType,
              amount: cleanAmount,
              date: new Date().toISOString(),
              adminId: "admin",
          };
      }

      await updateDoc(doc(db, "clients", selectedClient.id), updateData);
      
      toast.success(transactionType === "deposit" ? "Recarga exitosa" : "Descuento exitoso");
      setIsRechargeOpen(false);
      setRechargeAmount("");
    } catch {
      toast.error("Error en la transacción");
    }
  };

  const openWhatsApp = (phone, name) => {
    window.open(`https://wa.me/${phone}?text=Hola ${name}`, "_blank");
  };

  const filteredClients = clients.filter(
    (c) =>
      (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm)),
  );

  if (loading)
    return (
      <div className="p-8 text-center text-slate-400 font-bold">
        Cargando...
      </div>
    );

  return (
    <div className="h-full flex flex-col">
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
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 h-full overflow-hidden pb-2">
        <div className="w-full md:w-1/3 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b shrink-0">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Buscar cliente..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-lg text-sm focus:border-blue-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredClients.map((client) => {
              const stats = getClientStats(client.phone);
              return (
                <div
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className={`p-4 border-b cursor-pointer hover:bg-slate-50 ${selectedClientId === client.id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${client.isVip ? "bg-yellow-500" : "bg-slate-400"}`}
                      >
                        {" "}
                        {(client.name || "??")
                          .substring(0, 2)
                          .toUpperCase()}{" "}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm truncate max-w-[150px]">
                          {client.name}
                        </h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          {" "}
                          <Phone size={10} /> {client.phone}{" "}
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
                    <span className="bg-slate-100 px-2 py-1 rounded font-bold">
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
            <div className="flex-1 overflow-y-auto">
              <div className="h-40 bg-gradient-to-r from-blue-50 to-slate-100 relative">
                <button
                  onClick={() => deleteClient(selectedClient.id)}
                  className="absolute top-4 right-4 bg-white/50 text-slate-500 p-2 rounded-full hover:bg-red-500 hover:text-white transition backdrop-blur-sm"
                >
                  {" "}
                  <Trash2 size={18} />{" "}
                </button>
              </div>
              <div className="px-4 md:px-8 -mt-16 pb-6 relative">
                <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-6 gap-4">
                  <div className="flex flex-col md:flex-row items-center md:items-end gap-3 md:gap-5 text-center md:text-left">
                    {/* CORRECCIÓN: Eliminado conflicto de bg-white y bg-slate-100 */}
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-full p-1.5 shadow-xl flex items-center justify-center text-3xl md:text-4xl font-bold text-slate-400 bg-slate-100 border-4 border-white">
                      {(selectedClient.name || "?")
                        .substring(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="mb-0 md:mb-3">
                      <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center justify-center md:justify-start gap-2">
                        {" "}
                        {selectedClient.name}
                        <button
                          onClick={() => toggleVip(selectedClient.id)}
                          className={`${selectedClient.isVip ? "text-yellow-400" : "text-slate-300"}`}
                        >
                          {" "}
                          <Star
                            size={24}
                            className={
                              selectedClient.isVip ? "fill-yellow-400" : ""
                            }
                          />{" "}
                        </button>
                      </h2>
                      <p className="text-sm text-slate-500 font-medium">
                        {" "}
                        Cliente desde: {selectedClient.joinDate}{" "}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      openWhatsApp(selectedClient.phone, selectedClient.name)
                    }
                    className="w-full md:w-auto mb-0 md:mb-4 bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-green-600/30 flex items-center justify-center gap-2"
                  >
                    {" "}
                    <MessageCircle size={20} /> Contactar{" "}
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                  <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100">
                    <p className="text-xs font-bold text-green-600 uppercase mb-2 flex items-center gap-1">
                      {" "}
                      <Wallet size={12} /> Saldo en Billetera{" "}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-black text-green-700">
                        {" "}
                        ${(selectedClient.balance || 0).toLocaleString()}{" "}
                      </span>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => {
                            setTransactionType("deposit");
                            setWalletType("main");
                            setIsRechargeOpen(true);
                          }}
                          className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg hover:bg-green-700 transition"
                        >
                          Recargar (+)
                        </button>
                        <button
                          onClick={() => {
                            setTransactionType("withdrawal");
                            setWalletType("main");
                            setIsRechargeOpen(true);
                          }}
                          className="bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg hover:bg-red-600 transition"
                        >
                          Descontar (-)
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* TARJETA DE SALDO DE INVERSIÓN */}
                  <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                    <p className="text-xs font-bold text-indigo-600 uppercase mb-2 flex items-center gap-1">
                      {" "}
                      <TrendingUp size={12} /> Saldo de Inversión{" "}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-black text-indigo-700">
                        {" "}
                        ${(selectedClient.investmentBalance || 0).toLocaleString()}{" "}
                      </span>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => {
                            setTransactionType("deposit");
                            setWalletType("investment");
                            setIsRechargeOpen(true);
                          }}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-700 transition"
                        >
                          Recargar (+)
                        </button>
                        <button
                          onClick={() => {
                            setTransactionType("withdrawal");
                            setWalletType("investment");
                            setIsRechargeOpen(true);
                          }}
                          className="bg-purple-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg hover:bg-purple-600 transition"
                        >
                          Descontar (-)
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-2xl border">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                      {" "}
                      Total Comprado{" "}
                    </p>
                    <span className="text-2xl font-black text-slate-700">
                      {" "}
                      $
                      {getClientStats(
                        selectedClient.phone,
                      ).total.toLocaleString()}{" "}
                    </span>
                    <p className="text-sm text-slate-500 mt-1">
                      {" "}
                      {getClientStats(selectedClient.phone).count} pedidos{" "}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                  <div className="p-5 bg-slate-50 rounded-2xl border">
                    {" "}
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                      {" "}
                      Contacto{" "}
                    </p>{" "}
                    <div className="text-sm text-slate-700 mb-2 font-medium flex items-center gap-2">
                      <Phone size={14} /> {selectedClient.phone}
                    </div>{" "}
                    <div className="text-sm text-slate-700 font-medium flex items-center gap-2">
                      <Mail size={14} /> {selectedClient.email}
                    </div>{" "}
                  </div>
                  <div className="p-5 bg-slate-50 rounded-2xl border">
                    {" "}
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                      {" "}
                      Ubicación{" "}
                    </p>{" "}
                    <div className="text-sm text-slate-700 font-medium mb-2 flex items-center gap-2">
                      <Map size={14} /> {selectedClient.department}
                    </div>{" "}
                    <div className="text-sm text-slate-700 font-medium flex items-center gap-2">
                      <Building2 size={14} /> {selectedClient.city}
                    </div>{" "}
                  </div>
                </div>
                <div className="mb-8">
                  {" "}
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                    {" "}
                    Dirección de Envío{" "}
                  </p>{" "}
                  <div className="p-4 bg-slate-50 rounded-xl border text-sm text-slate-700 flex items-start gap-3">
                    <MapPin size={16} className="text-slate-400" />{" "}
                    {selectedClient.address}
                  </div>{" "}
                </div>
                <div className="mb-8">
                  {" "}
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                    {" "}
                    Notas Internas{" "}
                  </label>{" "}
                  <textarea
                    className="w-full bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-slate-700 focus:outline-none resize-none"
                    rows="2"
                    value={selectedClient.notes || ""}
                    onChange={(e) =>
                      handleUpdateNotes(selectedClient.id, e.target.value)
                    }
                  ></textarea>{" "}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
              {" "}
              <User size={48} className="opacity-50" />{" "}
              <p className="font-medium text-lg">Selecciona un cliente</p>{" "}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              {" "}
              <h2 className="text-xl font-bold text-slate-800">
                Registrar Cliente
              </h2>{" "}
              <button onClick={() => setIsModalOpen(false)}>
                {" "}
                <X className="text-slate-400 hover:text-red-500" />{" "}
              </button>{" "}
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <input
                type="text"
                placeholder="Nombre Completo"
                required
                className="w-full p-3 border rounded-xl outline-none focus:border-blue-500"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
              <input
                type="tel"
                placeholder="Teléfono"
                required
                maxLength={10}
                className="w-full p-3 border rounded-xl outline-none"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    phone: e.target.value.replace(/\D/g, ""),
                  })
                }
              />
              <input
                type="email"
                placeholder="Correo Electrónico"
                required
                className="w-full p-3 border rounded-xl outline-none focus:border-blue-500"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Dirección de Envío"
                className="w-full p-3 border rounded-xl outline-none focus:border-blue-500"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition"
              >
                {" "}
                Guardar Cliente{" "}
              </button>
            </form>
          </div>
        </div>
      )}

      {isRechargeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              {" "}
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {" "}
                <DollarSign className={transactionType === "deposit" ? "text-green-600" : "text-red-500"} /> 
                {transactionType === "deposit" ? "Recargar" : "Descontar"} {walletType === 'investment' ? "Inversión" : "Billetera"}
              </h2>{" "}
              <button onClick={() => setIsRechargeOpen(false)}>
                {" "}
                <X className="text-slate-400 hover:text-red-500" />{" "}
              </button>{" "}
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="$ 0"
                className={`w-full p-4 bg-slate-50 border rounded-xl font-bold text-lg outline-none transition-colors ${transactionType === "deposit" ? "focus:border-green-500 text-green-700" : "focus:border-red-500 text-red-700"}`}
                value={rechargeAmount}
                onChange={handleRechargeChange}
              />
              <div className="grid grid-cols-3 gap-2">
                {" "}
                {[10000, 20000, 50000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setRechargeAmount(formatCurrency(amount))}
                    className="py-2 bg-slate-100 hover:bg-green-100 rounded-xl font-bold text-sm"
                  >
                    {" "}
                    +${amount.toLocaleString()}{" "}
                  </button>
                ))}{" "}
              </div>
              <button
                onClick={handleRecharge}
                disabled={!rechargeAmount}
                className={`w-full text-white font-bold py-3.5 rounded-xl transition hover:opacity-90 disabled:opacity-50 ${transactionType === "deposit" ? "bg-green-600" : "bg-red-500"}`}
              >
                {" "}
                Confirmar {transactionType === "deposit" ? "Recarga" : "Descuento"}{" "}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
