import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Info, Wallet } from 'lucide-react';
import { useFinnhub } from '../../hooks/useFinnhub';
import { useInvestmentGrowth } from '../../hooks/useInvestmentGrowth';
import { db } from '../../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore'; 
import { useState, useEffect } from 'react';

// Datos de ejemplo para el gráfico (Simulando rendimiento de portafolio)
// Datos del gráfico (Inicialmente plano o basado en el historial real si existiera)
const data = [
  { name: 'Inicio', value: 0 },
  { name: 'Actual', value: 0 },
];

// 2. ACTIVOS: Vacío por defecto (Solo se llena si el usuario compra acciones reales en el futuro)
const MY_ASSETS = [];

// OPORTUNIDADES DE MERCADO PARA CUENTAS NUEVAS (watchlist)
const MARKET_OPPORTUNITIES = [
  { symbol: 'GRJN', name: 'Grupo Jenta', type: 'NASDAQ', color: 'text-indigo-900', bg: 'bg-white', isLogo: true, logo: '/img/logo tienda jenta.svg', price: 0.12, simulatedChange: 1.42 },
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'NASDAQ', color: 'text-blue-600', bg: 'bg-blue-100' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', type: 'NASDAQ', color: 'text-red-600', bg: 'bg-red-100' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'NASDAQ', color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { symbol: 'AMZN', name: 'Amazon', type: 'NASDAQ', color: 'text-slate-900', bg: 'bg-slate-100' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'NASDAQ', color: 'text-green-600', bg: 'bg-green-100' },
];

// Sub-componente movido afuera para evitar re-renderizados innecesarios
const StockRow = ({ asset, isHoldings }) => {
    const { data, loading } = useFinnhub(asset.symbol);
    const navigate = useNavigate();

    if (loading) {
        return (
            <tr className="animate-pulse">
                <td className="p-5"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                <td className="p-5 text-right"><div className="h-4 bg-slate-100 rounded w-16 ml-auto"></div></td>
                <td className="p-5 text-right"><div className="h-4 bg-slate-100 rounded w-12 ml-auto"></div></td>
                {isHoldings && (
                    <>
                        <td className="p-5 text-right hidden md:table-cell"><div className="h-4 bg-slate-100 rounded w-10 ml-auto"></div></td>
                        <td className="p-5 text-right"><div className="h-4 bg-slate-100 rounded w-20 ml-auto"></div></td>
                    </>
                )}
            </tr>
        );
    }

    const price = asset.price || (data?.price || 0);
    const change = asset.simulatedChange || (asset.price ? 0 : (data?.change || 0));
    const percent = asset.simulatedChange || (asset.price ? 0 : (data?.percent || 0));
    const totalValue = price * (asset.qty || 0);
    const isPositive = change >= 0;

    return (
        <tr 
            onClick={() => navigate(`/inversiones/${asset.symbol}`)}
            className="hover:bg-slate-50 transition cursor-pointer group"
        >
            <td className="p-5 font-medium text-slate-900 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${asset.bg} flex items-center justify-center ${asset.color} font-black text-xs shadow-sm group-hover:scale-110 transition-transform overflow-hidden`}>
                    {asset.isLogo ? (
                        <img src={asset.logo} alt={asset.name} className="w-full h-full object-cover" />
                    ) : (
                        asset.symbol
                    )}
                </div>
                <div>
                    <p className="font-bold">{asset.name}</p>
                    <p className="text-xs text-slate-400 font-medium">{asset.type}</p>
                </div>
            </td>
            <td className="p-5 text-right font-bold text-slate-700">${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td className="p-5 text-right">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${isPositive ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                    {isPositive ? <ArrowUpRight size={14} strokeWidth={3} /> : <ArrowDownRight size={14} strokeWidth={3} />}
                    {Math.abs(percent).toFixed(2)}%
                </span>
            </td>
            {isHoldings && (
                <>
                    <td className="p-5 text-right font-medium text-slate-500 hidden md:table-cell">
                        {asset.qty} {asset.type === 'CRYPTO' ? '' : 'acc.'}
                    </td>
                    <td className="p-5 text-right font-black text-slate-900">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </>
            )}
        </tr>
    );
};

export default function InvestmentDashboard() {
  const [investmentBalance, setInvestmentBalance] = useState(0);
  const [projectedRate, setProjectedRate] = useState(0.016); // 1.6% Promedio Inicial
  const [userId, setUserId] = useState(null);
  const [totalAssetsValue, setTotalAssetsValue] = useState(0);
  const [loading, setLoading] = useState(true);

  // EFECTO: Simular fluctuación del mercado en vivo (Rango 1.5% - 1.7%)
  useEffect(() => {
    const interval = setInterval(() => {
        // Generar tasa aleatoria entre 0.0150 y 0.0170
        const randomRate = 0.0150 + Math.random() * (0.0170 - 0.0150);
        setProjectedRate(randomRate);
    }, 5000); // Actualiza cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  // 1. Obtener Usuario
  useEffect(() => {
      const session = sessionStorage.getItem("shopUser");
      if (session) {
          const user = JSON.parse(session);
          if (user.id) setUserId(user.id);
      }
  }, []);

  // 2. Hook de Crecimiento (Se ejecuta al tener userId)
  useInvestmentGrowth(userId);

  // 3. Escuchar cambios en Saldo (para reflejar el crecimiento en vivo)
  useEffect(() => {
      if (userId) {
          const unsub = onSnapshot(doc(db, "clients", userId), (doc) => {
              if (doc.exists()) {
                  setInvestmentBalance(doc.data().investmentBalance || 0);
              }
              setLoading(false);
          });
          return () => unsub();
      } else {
          setLoading(false);
      }
  }, [userId]);

  // 2. Calcular Valor Total de Activos (Simulado por ahora con MY_ASSETS)
  // En el futuro, MY_ASSETS vendría de la subcolección 'investments' del cliente
  useEffect(() => {
     // Simplemente sumamos el valor dummy actual para el demo
     // En producción, iteraríamos sobre los precios reales obtenidos
     // Por ahora hardcodeamos un valor base + el balance real
     let assetsVal = 0;
     MY_ASSETS.forEach(a => {
         // Precio base dummy para calc rápido (en app real usaríamos el precio vivo)
         const basePrices = { 'AAPL': 185, 'TSLA': 240, 'BTC': 45000, 'AMZN': 145 };
         assetsVal += (basePrices[a.symbol] || 100) * a.qty;
     });
     setTotalAssetsValue(assetsVal);
  }, []);

  const totalPortfolioValue = totalAssetsValue + investmentBalance;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      
      {/* 1. HEADER & RESUMEN */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-light text-slate-800 tracking-tight">
            Mi Portafolio
          </h1>
          <div className="flex items-baseline gap-4 mt-2">
            <span className="text-5xl font-bold text-slate-900 tracking-tighter">
              ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {/* Indicador de Rendimiento (Por ahora 0% hasta que haya histórico real) */}
            <div className={`flex items-center gap-1 font-medium px-3 py-1 rounded-full ${totalPortfolioValue > 0 ? 'text-green-600 bg-green-50' : 'text-slate-400 bg-slate-100'}`}>
              <ArrowUpRight size={20} />
              <span className="text-lg">0.0%</span>
              <span className="text-sm text-slate-500 font-normal ml-1">hoy</span>
            </div>
          </div>
          <p className="text-sm text-slate-400 mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Mercado Abierto • Actualizado: {new Date().toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex gap-4">
            {/* TARJETA DE MI INVERSIÓN (antes Poder de Compra) */}
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex flex-col justify-center min-w-[200px]">
                <div className="flex items-center gap-2 mb-1 text-indigo-600 font-bold text-xs uppercase tracking-wide">
                    <Wallet size={14} /> Mi Inversión
                </div>
                <div className="text-2xl font-black text-indigo-900">
                    ${investmentBalance.toLocaleString()}
                </div>
            </div>

            {/* TARJETA DE RENDIMIENTO ESPERADO (Nueva) */}
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex flex-col justify-center min-w-[200px]">
                <div className="flex items-center gap-2 mb-1 text-emerald-600 font-bold text-xs uppercase tracking-wide">
                    <TrendingUp size={14} /> Rendimiento Estimado
                </div>
                <div className="text-2xl font-black text-emerald-900 transition-all duration-1000">
                    +${(investmentBalance * projectedRate).toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-sm font-medium text-emerald-600">/ mes</span>
                </div>
                <div className="text-[10px] text-emerald-500 font-bold mt-1">
                    {(projectedRate * 100).toFixed(2)}% Variable
                </div>
            </div>
        </div>
      </div>

      {/* 2. GRÁFICO PRINCIPAL */}
      <div className="h-[350px] w-full bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 12, fill: '#94a3b8'}}
                dy={10}
                hide // Ocultamos eje X si no hay datos relevantes
            />
            <Tooltip 
                contentStyle={{
                    backgroundColor: '#1e293b', 
                    borderRadius: '12px', 
                    border: 'none', 
                    color: '#fff',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                }}
                itemStyle={{ color: '#fff' }}
                cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorValue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 3. LISTA DE ACTIVOS ("Tus Inversiones") */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="text-blue-600" /> 
                {MY_ASSETS.length > 0 ? "Tus Activos" : "Oportunidades de Mercado"}
            </h2>
            <button className="text-blue-600 font-bold text-sm hover:underline">Ver todo</button>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                        <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Activo</th>
                        <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Precio</th>
                        <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Cambio</th>
                        {MY_ASSETS.length > 0 && (
                            <>
                                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right hidden md:table-cell">Tenencias</th>
                                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Valor Total</th>
                            </>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {(MY_ASSETS.length > 0 ? MY_ASSETS : MARKET_OPPORTUNITIES).map((asset) => (
                        <StockRow key={asset.symbol} asset={asset} isHoldings={MY_ASSETS.length > 0} />
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
