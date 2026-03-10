import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Info, Wallet, User } from 'lucide-react';
import { useFinnhub } from '../../hooks/useFinnhub';
import { useInvestmentGrowth } from '../../hooks/useInvestmentGrowth';
import { db } from '../../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';


// Datos de ejemplo para el gráfico (Simulando rendimiento de portafolio)
// Datos del gráfico (Inicialmente plano o basado en el historial real si existiera)
const data = [
  { name: 'Inicio', value: 0 },
  { name: 'Actual', value: 0 },
];

// 2. ACTIVOS: Vacío por defecto (Solo se llena si el usuario compra acciones reales en el futuro)
const MY_ASSETS = [];

// OPORTUNIDADES DE MERCADO (Pool de S&P 500 para rotación con Logos)
const SP500_TICKERS = [
  // Tech Giants
  { s: 'AAPL', d: 'apple.com' }, { s: 'MSFT', d: 'microsoft.com' }, { s: 'GOOGL', d: 'abc.xyz' },
  { s: 'AMZN', d: 'amazon.com' }, { s: 'NVDA', d: 'nvidia.com' }, { s: 'META', d: 'meta.com' },
  { s: 'TSLA', d: 'tesla.com' }, { s: 'NFLX', d: 'netflix.com' }, { s: 'ADBE', d: 'adobe.com' },
  { s: 'CRM', d: 'salesforce.com' }, { s: 'AMD', d: 'amd.com' }, { s: 'INTC', d: 'intel.com' },
  // Finance
  { s: 'JPM', d: 'jpmorganchase.com' }, { s: 'BAC', d: 'bankofamerica.com' }, { s: 'V', d: 'visa.com' },
  { s: 'MA', d: 'mastercard.com' }, { s: 'GS', d: 'goldmansachs.com' }, { s: 'MS', d: 'morganstanley.com' },
  { s: 'WFC', d: 'wellsfargo.com' }, { s: 'BLK', d: 'blackrock.com' },
  // Consumer
  { s: 'KO', d: 'coca-colacompany.com' }, { s: 'PEP', d: 'pepsico.com' }, { s: 'PG', d: 'pg.com' },
  { s: 'COST', d: 'costco.com' }, { s: 'WMT', d: 'walmart.com' }, { s: 'TGT', d: 'target.com' },
  { s: 'NKE', d: 'nike.com' }, { s: 'MCD', d: 'mcdonalds.com' }, { s: 'SBUX', d: 'starbucks.com' },
  // Healthcare
  { s: 'JNJ', d: 'jnj.com' }, { s: 'PFE', d: 'pfizer.com' }, { s: 'UNH', d: 'unitedhealthgroup.com' },
  { s: 'LLY', d: 'lilly.com' }, { s: 'MRK', d: 'merck.com' }, { s: 'ABBV', d: 'abbvie.com' },
  // Industrial & Others
  { s: 'BA', d: 'boeing.com' }, { s: 'CAT', d: 'caterpillar.com' }, { s: 'GE', d: 'ge.com' },
  { s: 'MMM', d: '3m.com' }, { s: 'HON', d: 'honeywell.com' }, { s: 'UPS', d: 'ups.com' },
  { s: 'DIS', d: 'disney.com' }, { s: 'XOM', d: 'exxonmobil.com' }, { s: 'CVX', d: 'chevron.com' }
];



// Sub-componente movido afuera para evitar re-renderizados innecesarios
const StockRow = ({ asset, isHoldings }) => {
  const { data, loading } = useFinnhub(asset.symbol);
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

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
      <td className="px-2 py-3 md:p-5 font-medium text-slate-900 flex items-center gap-2 md:gap-4">
        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl ${asset.bg} flex items-center justify-center ${asset.color} font-black text-[10px] md:text-xs shadow-sm group-hover:scale-110 transition-transform overflow-hidden shrink-0`}>
          {asset.isLogo && !imgError ? (
            <div className="w-full h-full p-0.5 md:p-1 flex items-center justify-center bg-white rounded-xl">
              <img
                src={asset.logo}
                alt={asset.name}
                className="w-full h-full object-contain"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            asset.symbol
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm md:text-base truncate max-w-[80px] sm:max-w-none">{asset.name}</p>
          <p className="text-[10px] md:text-xs text-slate-400 font-medium whitespace-nowrap">{asset.type}</p>
        </div>
      </td>
      <td className="px-2 py-3 md:p-5 text-right font-bold text-slate-700 text-sm md:text-base whitespace-nowrap">${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td className="px-2 py-3 md:p-5 text-right whitespace-nowrap">
        <span className={`inline-flex items-center gap-0.5 md:gap-1 px-1.5 py-0.5 md:px-2.5 md:py-1 rounded-lg text-[10px] md:text-xs font-bold ${isPositive ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
          {isPositive ? <ArrowUpRight size={12} className="md:w-3.5 md:h-3.5" strokeWidth={3} /> : <ArrowDownRight size={12} className="md:w-3.5 md:h-3.5" strokeWidth={3} />}
          {Math.abs(percent).toFixed(2)}%
        </span>
      </td>
      {isHoldings && (
        <>
          <td className="p-3 md:p-5 text-right font-medium text-slate-500 hidden md:table-cell">
            {asset.qty} {asset.type === 'CRYPTO' ? '' : 'acc.'}
          </td>
          <td className="p-3 md:p-5 text-right font-black text-slate-900">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </>
      )}
    </tr>
  );
};

export default function InvestmentDashboard() {
  const navigate = useNavigate();
  const [investmentBalance, setInvestmentBalance] = useState(0);
  const [projectedRate, setProjectedRate] = useState(0.016); // 1.6% Promedio Inicial
  const [dailyRateUI, setDailyRateUI] = useState(0.05); // Estado individual para la vista "Hoy"
  const [userId, setUserId] = useState(null);

  const [totalAssetsValue, setTotalAssetsValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marketOpen, setMarketOpen] = useState(false);

  // OPORTUNIDADES DE MERCADO
  const [marketOpportunities, setMarketOpportunities] = useState([]);

  // Calcula si el mercado NYSE está abierto ahora mismo
  const isMarketOpen = () => {
    // Usamos la zona horaria de Nueva York para manejar DST automáticamente
    const now = new Date();
    const nyTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric', minute: 'numeric', weekday: 'short',
      hour12: false,
    }).formatToParts(now);

    const get = (type) => parseInt(nyTime.find(p => p.type === type)?.value || '0');
    const weekday = nyTime.find(p => p.type === 'weekday')?.value; // 'Mon', 'Tue', etc.
    const hour = get('hour');
    const minute = get('minute');
    const totalMinutes = hour * 60 + minute;

    const isWeekday = !['Sat', 'Sun'].includes(weekday);
    const openMinutes = 9 * 60 + 30;  // 9:30 AM ET
    const closeMinutes = 16 * 60;       // 4:00 PM ET

    return isWeekday && totalMinutes >= openMinutes && totalMinutes < closeMinutes;
  };

  // EFECTO: Seleccionar acciones aleatorias al montar
  useEffect(() => {
    // Seleccionar 6 aleatorias del pool S&P 500
    const shuffled = [...SP500_TICKERS].sort(() => 0.5 - Math.random());

    // Paleta de colores vibrantes para avatares (fallback si falla logo)
    const colors = [
      { bg: 'bg-blue-100', text: 'text-blue-700' },
      { bg: 'bg-emerald-100', text: 'text-emerald-700' },
      { bg: 'bg-purple-100', text: 'text-purple-700' },
      { bg: 'bg-amber-100', text: 'text-amber-700' },
      { bg: 'bg-rose-100', text: 'text-rose-700' },
      { bg: 'bg-cyan-100', text: 'text-cyan-700' },
      { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    ];

    const randomPicks = shuffled.slice(0, 6).map((item, index) => {
      const theme = colors[index % colors.length];
      return {
        symbol: item.s,
        name: item.s,
        type: 'NASDAQ',
        color: theme.text,
        bg: theme.bg,
        isLogo: true,
        logo: `https://logo.clearbit.com/${item.d}`
      };
    });

    setMarketOpportunities(randomPicks);
  }, []);

  // ESTADO: Simulador
  const [simAmount, setSimAmount] = useState(1000000); // 1M por defecto
  const [simMonths, setSimMonths] = useState(12); // 1 año por defecto

  // EFECTO: Actualizar estado del mercado cada minuto
  useEffect(() => {
    setMarketOpen(isMarketOpen()); // Verificación inicial
    const interval = setInterval(() => setMarketOpen(isMarketOpen()), 60000);
    return () => clearInterval(interval);
  }, []);

  // EFECTO: Fluctuación del mercado en vivo
  useEffect(() => {
    // Función determinista para decidir si hoy el mercado "amaneció mal" (15% de probabilidad, impredecible de antemano)
    const seedDate = new Date().toISOString().split('T')[0];
    let hash = 0;
    for (let i = 0; i < seedDate.length; i++) {
      hash = ((hash << 5) - hash) + seedDate.charCodeAt(i);
      hash |= 0;
    }
    const pseudoRandom = Math.abs(Math.sin(hash));
    const isNegativeDay = pseudoRandom < 0.15; // 15% chance de día rojo

    if (!marketOpen) {
      setDailyRateUI(isNegativeDay ? -0.06 : 0.05);
      return;
    }

    const interval = setInterval(() => {
      // Mensual: siempre positivo rondando el 1.5% - 1.7% para no afectar previsiones a largo plazo
      const randomRate = 0.0150 + Math.random() * (0.0170 - 0.0150);
      setProjectedRate(randomRate);

      // Diario: si es día rojo, mostrar negativa. Si no, dividir el mensual.
      if (isNegativeDay) {
        setDailyRateUI(-(0.04 + Math.random() * 0.05)); // -0.04% a -0.09% Visual
      } else {
        setDailyRateUI((randomRate / 30) * 100);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [marketOpen]);

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
      <div className="border-b border-slate-200 pb-6">
        {/* Primera fila: Título y Botón */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-light text-slate-800 tracking-tight">
            Mi Portafolio
          </h1>

          {/* Botón para volver al Dashboard del Cliente */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate('/perfil');
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600/90 to-indigo-700/90 hover:from-indigo-700/95 hover:to-indigo-800/95 text-white rounded-xl font-medium shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:shadow-indigo-300/60 transition-all duration-200 hover:scale-105 active:scale-95 group cursor-pointer"
          >
            <User size={18} className="group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">Mi Perfil</span>
            <span className="sm:hidden">Perfil</span>
          </button>
        </div>

        {/* Segunda fila: Valor del Portafolio + Tarjetas */}
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
          {/* Columna izquierda: Valor del portafolio */}
          <div className="flex-shrink-0">
            <div className="flex flex-wrap items-baseline gap-2 md:gap-4">
              <span className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tighter">
                ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {/* Indicador de Rendimiento */}
              <div className={`flex items-center gap-1 font-medium px-2 py-0.5 md:px-3 md:py-1 rounded-full ${totalPortfolioValue === 0 ? 'text-slate-400 bg-slate-100' : dailyRateUI >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                {dailyRateUI >= 0 ? <ArrowUpRight size={16} className="md:w-5 md:h-5" /> : <ArrowDownRight size={16} className="md:w-5 md:h-5" />}
                <span className="text-sm md:text-lg">
                  {totalPortfolioValue > 0 ? `${dailyRateUI > 0 ? '+' : ''}${dailyRateUI.toFixed(2)}%` : '0.0%'}
                </span>
                <span className="text-xs md:text-sm text-slate-500 font-normal ml-1">hoy</span>
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-2 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${marketOpen ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`}></span>
              {marketOpen ? 'Mercado Abierto' : 'Mercado Cerrado'} • Actualizado: {new Date().toLocaleTimeString()}
            </p>
          </div>

          {/* Columna derecha: Tarjetas de resumen */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {/* TARJETA DE MI INVERSIÓN */}
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex flex-col justify-center flex-1 sm:min-w-[200px]">
              <div className="flex items-center gap-2 mb-1 text-indigo-600 font-bold text-xs uppercase tracking-wide">
                <Wallet size={14} /> Mi Inversión
              </div>
              <div className="text-2xl font-black text-indigo-900 truncate">
                {investmentBalance.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
              </div>
            </div>

            {/* TARJETA DE RENDIMIENTO ESPERADO */}
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex flex-col justify-center flex-1 sm:min-w-[200px]">
              <div className="flex items-center gap-2 mb-1 text-emerald-600 font-bold text-xs uppercase tracking-wide">
                <TrendingUp size={14} /> Rendimiento Estimado
              </div>
              <div className="text-2xl font-black text-emerald-900 transition-all duration-1000 truncate">
                +{(investmentBalance * projectedRate).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })} <span className="text-sm font-medium text-emerald-600">/ mes</span>
              </div>
              <div className="text-[10px] text-emerald-500 font-bold mt-1">
                {(projectedRate * 100).toFixed(2)}% Variable
              </div>
            </div>
          </div>
        </div>

        {/* 1.6 BANNER PROMOCIONAL APP (NUEVO - MODELO HÍBRIDO) */}
        <div className="mt-8 bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-[2rem] p-6 md:p-10 shadow-2xl relative overflow-hidden group border border-indigo-400/20">
          {/* Decoración abstracta de fondo */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/15 transition-all duration-700"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-400/20 rounded-full -ml-10 -mb-10 blur-2xl"></div>

          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 md:gap-12">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/30 backdrop-blur-md rounded-full text-indigo-100 text-[10px] md:text-sm font-bold uppercase tracking-widest mb-4 border border-indigo-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Nueva Experiencia Móvil
              </div>
              <h2 className="text-2xl md:text-4xl font-black text-white mb-4 leading-tight">
                Gestiona tu Capital con <span className="text-emerald-400">Total Libertad</span>
              </h2>
              <p className="text-indigo-100/80 text-sm md:text-lg mb-8 leading-relaxed max-w-2xl font-medium">
                Descarga la App de <span className="text-white font-bold">Grupo Jenta</span> para recibir notificaciones en tiempo real, ver el historial detallado de tus rendimientos diarios y gestionar retiros desde la palma de tu mano.
              </p>

              {/* Botones de Descarga (Simulados) */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                <button className="flex items-center gap-3 bg-black text-white px-6 py-3 rounded-2xl hover:bg-slate-900 transition-all hover:scale-105 active:scale-95 border border-white/10 shadow-xl pointer-events-none opacity-80">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <svg viewBox="0 0 512 512" width="24" height="24" fill="currentColor">
                      <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l236.6-236.6L47 0zm393.5 139.7l-58-33.3-67.3 67.3 65.2 65.2 60.1-34.4c12.3-7 20.3-19.3 20.3-33.5.1-14.1-8-26.4-20.3-31.3zM283.6 275.4L47 512l220.7-126.6 60.1-60.1-44.2-49.9z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] uppercase font-bold opacity-60 leading-none mb-0.5">Consíguelo en</p>
                    <p className="text-base font-black leading-none">Google Play</p>
                  </div>
                </button>

                <button className="flex items-center gap-3 bg-black text-white px-6 py-3 rounded-2xl hover:bg-slate-900 transition-all hover:scale-105 active:scale-95 border border-white/10 shadow-xl pointer-events-none opacity-80">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <svg viewBox="0 0 384 512" width="24" height="24" fill="currentColor">
                      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] uppercase font-bold opacity-60 leading-none mb-0.5">Descargar en</p>
                    <p className="text-base font-black leading-none">App Store</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Ilustración de Mockup Móvil Simulado */}
            <div className="hidden lg:flex w-64 h-[400px] bg-slate-900 rounded-[3rem] border-8 border-slate-800 shadow-2xl relative items-center justify-center rotate-3 group-hover:rotate-0 transition-all duration-500 overflow-hidden shrink-0">
              <div className="absolute top-2 w-16 h-4 bg-slate-800 rounded-full"></div>
              {/* Contenido simulado de la app */}
              <div className="w-full h-full p-6 pt-12 space-y-4">
                <div className="w-full h-24 bg-indigo-500/20 rounded-2xl flex flex-col justify-center p-4">
                  <div className="w-12 h-2 bg-indigo-400/40 rounded mb-2"></div>
                  <div className="w-20 h-4 bg-emerald-400 rounded"></div>
                </div>
                <div className="w-full h-40 bg-slate-800 rounded-2xl relative p-4 overflow-hidden">
                  <div className="w-full h-full border-b border-l border-white/5 flex items-end">
                    <div className="w-4 h-12 bg-emerald-400/30 mx-1 rounded-t"></div>
                    <div className="w-4 h-16 bg-emerald-400/50 mx-1 rounded-t"></div>
                    <div className="w-4 h-24 bg-emerald-400 mx-1 rounded-t"></div>
                    <div className="w-4 h-20 bg-emerald-400/70 mx-1 rounded-t"></div>
                  </div>
                </div>
                <div className="w-full h-12 bg-white rounded-xl flex items-center justify-center">
                  <div className="w-20 h-2 bg-slate-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 1.5 SECCIÓN SIMULADOR (NUEVO) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* TARJETA DE SIMULACIÓN */}
          {/* TARJETA DE SIMULACIÓN */}
          {/* TARJETA DE SIMULACIÓN */}
          <div className="lg:col-span-1 bg-white border border-indigo-50 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
            {/* Efecto de fondo sutil (Índigo para conectar con la marca) */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-[60px] opacity-60 group-hover:opacity-80 transition-opacity"></div>

            <h3 className="text-lg font-bold mb-6 flex items-center gap-3 relative z-10 text-slate-800">
              <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600 shadow-sm border border-indigo-100">
                <TrendingUp size={20} />
              </div>
              Simular Inversión
            </h3>

            <div className="space-y-6 relative z-10">
              {/* Input Monto */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-wide">Monto a Invertir</label>
                <div className="relative group/input">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold group-focus-within/input:text-indigo-500 transition-colors">$</span>
                  <input
                    type="text"
                    value={simAmount.toLocaleString('es-CO')}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\./g, '').replace(/,/g, '');
                      if (!isNaN(val) && val !== '') {
                        setSimAmount(parseInt(val, 10));
                      } else if (val === '') {
                        setSimAmount(0);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-8 pr-4 text-slate-900 font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-lg"
                  />
                </div>
              </div>

              {/* Slider Meses */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                  <label className="uppercase tracking-wide">Plazo</label>
                  <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-bold border border-indigo-100">{simMonths} Meses</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={simMonths}
                  onChange={(e) => setSimMonths(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-700 transition-colors"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                  <span>1 mes</span>
                  <span>5 años</span>
                </div>
              </div>

              {/* Resultado */}
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100/50">
                <p className="text-xs text-emerald-700 font-bold mb-1 uppercase tracking-wide opacity-80">Retorno Estimado</p>
                <p className="text-3xl font-black text-emerald-600 -tracking-tight">
                  ${(simAmount * Math.pow(1 + projectedRate, simMonths)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-200/50">
                    +{((Math.pow(1 + projectedRate, simMonths) - 1) * 100).toFixed(1)}%
                  </span>
                  <p className="text-[10px] text-emerald-600/70 font-medium">
                    en total
                  </p>
                </div>
                <p className="text-[10px] text-emerald-600/50 mt-3 font-medium pt-3 border-t border-emerald-200/50 dash-border">
                  *Proyección basada en tasa actual del {(projectedRate * 100).toFixed(2)}% mensual compuesta.
                </p>
                <div className="mt-4 p-3 bg-white/50 rounded-xl border border-emerald-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <TrendingUp size={14} />
                  </div>
                  <p className="text-[10px] text-slate-600 leading-tight">
                    <span className="font-bold text-indigo-700">¿Quieres empezar hoy?</span> Descarga la App para gestionar tu inversión real.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. GRÁFICO PRINCIPAL (Ahora ocupa 2 columnas) */}
          <div className="lg:col-span-2 h-[420px] bg-white p-4 rounded-3xl border border-slate-100 shadow-sm relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
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

          <div className="bg-white rounded-3xl border border-slate-200 overflow-x-auto no-scrollbar shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-2 py-3 md:p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Activo</th>
                  <th className="px-2 py-3 md:p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Precio</th>
                  <th className="px-2 py-3 md:p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Cambio</th>
                  {MY_ASSETS.length > 0 && (
                    <>
                      <th className="p-3 md:p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right hidden md:table-cell">Tenencias</th>
                      <th className="p-3 md:p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Valor Total</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(MY_ASSETS.length > 0 ? MY_ASSETS : marketOpportunities).map((asset) => (
                  <StockRow key={asset.symbol} asset={asset} isHoldings={MY_ASSETS.length > 0} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
