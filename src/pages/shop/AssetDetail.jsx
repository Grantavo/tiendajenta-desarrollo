import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { ArrowUpRight, ArrowDownRight, ChevronRight, ChevronLeft, Share2, Plus, GripHorizontal, User, Calendar, MapPin, Globe, Users } from 'lucide-react';
import { useFinnhub } from '../../hooks/useFinnhub';

// CONSTANTES Y CONFIGURACIÓN
const MARKET_OPEN_MINUTES = 9.5 * 60; // 9:30 AM
const MARKET_CLOSE_MINUTES = 16 * 60; // 4:00 PM
const EXTENDED_CLOSE_MINUTES = 18.5 * 60; // 6:30 PM (Para mostrar after-hours)

// DEBUG MODE (True para ver datos crudos)
const SHOW_DEBUG = true;

// Offset para el gradiente (dónde termina el mercado regular y empieza after-hours)
// (16 - 9.5) / (18.5 - 9.5) ≈ 0.722
const MARKET_CLOSE_OFFSET = (MARKET_CLOSE_MINUTES - MARKET_OPEN_MINUTES) / (EXTENDED_CLOSE_MINUTES - MARKET_OPEN_MINUTES);

// Generador de etiquetas de tiempo X-Axis
const generateTimeLabel = (index, totalPoints) => {
    const totalMinutes = EXTENDED_CLOSE_MINUTES - MARKET_OPEN_MINUTES;
    const interval = totalMinutes / totalPoints;
    const currentMinutes = MARKET_OPEN_MINUTES + (index * interval);
    
    const hours = Math.floor(currentMinutes / 60);
    const mins = Math.floor(currentMinutes % 60);
    
    // Formato "12:00", "15:00"
    if (mins < 15) return `${hours}:00`; 
    return `${hours}:${mins.toString().padStart(2, '0')}`;
};

// Generador de datos simulados
const generateDataForRange = (range, currentPrice, previousClose) => {
    const data = [];
    let points = 0;
    
    switch(range) {
        case '1 día': points = 80; break; 
        case '5 D': points = 60; break;
        case '1 mes': points = 30; break;
        case '6 M': points = 90; break;
        case 'YTD': points = 120; break;
        case '1 año': points = 150; break;
        case '5 años': points = 200; break;
        default: points = 50;
    }

    const volatility = range === '1 día' ? 0.008 : 0.02; 
    let price = range === '1 día' ? previousClose : (currentPrice * 0.9);

    for (let i = 0; i < points; i++) {
        const change = price * volatility * (Math.random() - 0.5);
        price += change;
        
        // Forzar precio final
        if (i === points - 1) price = currentPrice;

        let label = i;
        const now = new Date();
        // Generar timestamp aproximado para el tooltip
        let dateStr = "";
        
        if (range === '1 día') {
            label = generateTimeLabel(i, points);
            // Simular fecha actual + hora del label
            dateStr = `${now.getDate()} ${now.toLocaleString('es-CO', { month: 'short' })} ${now.getFullYear()} ${label}`;
        } else if (range === '1 año' || range === '5 años' || range === 'MÁX.') {
             const d = new Date();
             d.setDate(d.getDate() - (points - i) * 30); // Aprox mes
             label = d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
             dateStr = `${d.getDate()} ${d.toLocaleString('es-CO', { month: 'short' })} ${d.getFullYear()}`;
        } else {
             // Simular fechas pasadas (días)
             const d = new Date();
             d.setDate(d.getDate() - (points - i));
             label = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
             dateStr = `${d.getDate()} ${d.toLocaleString('es-CO', { month: 'short' })} ${d.getFullYear()}`;
        }

        // Volumen aleatorio simulado
        const volume = Math.floor(Math.random() * 100) + 10;

        data.push({
            time: label,
            value: price,
            volume: volume,
            dateFull: dateStr
        });
    }
    return data;
};

// Componente del Punto Pulsante
const CustomizedDot = (props) => {
    const { cx, cy, stroke, index, data } = props;
    if (index === data.length - 1) {
      return (
        <svg x={cx - 5} y={cy - 5} width={10} height={10} viewBox="0 0 10 10">
            <circle cx="5" cy="5" r="5" fill={stroke} className="animate-ping opacity-75" />
            <circle cx="5" cy="5" r="3" fill={stroke} />
        </svg>
      );
    }
    return null;
};

// Componente Tooltip Personalizado estilo Google Finance
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-md text-sm z-50">
                <p className="font-medium text-slate-900 mb-1">
                    {payload[0].value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD $
                </p>
                <p className="text-slate-500 text-xs mb-0.5">
                    {data.dateFull}
                </p>
                <p className="text-slate-500 text-xs">
                    Volumen: {data.volume} mil
                </p>
            </div>
        );
    }
    return null;
};

export default function AssetDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const { data, loading, history, fetchHistory, historyLoading } = useFinnhub(symbol);
  
  // Si es GRJN, forzamos precio fijo y cambio positivo
  const price = symbol === 'GRJN' ? 0.12 : (data?.price || 180);
  const change = symbol === 'GRJN' ? 0.0017 : (data?.change || 0);
  const percent = symbol === 'GRJN' ? 1.42 : (data?.percent || 0);

  const isPositive = percent >= 0;
  const previousClose = price - change;


  
  // LISTA DE ACCIONES RELACIONADAS
  const RELATED_SYMBOLS = ["AAPL", "GOOGL", "MSFT", "AMZN", "NVDA", "TSLA", "NFLX", "META", "INTC"];

  const [timeRange, setTimeRange] = useState('1 día');
  const [isCompanyInfoOpen, setIsCompanyInfoOpen] = useState(false); // Por defecto cerrado para ahorrar espacio en móvil
  const scrollRef = React.useRef(null);

  const scroll = (direction) => {
      if (scrollRef.current) {
          const { current } = scrollRef;
          const scrollAmount = direction === 'left' ? -200 : 200;
          current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
  };
  
  // Agregar efecto para cargar historial al cambiar rango o símbolo
  React.useEffect(() => {
      if (symbol) {
          fetchHistory(timeRange);
      }
  }, [timeRange, symbol]);

  const chartData = useMemo(() => {
      // Prioridad 1: Historial Real de API (si existe y no es GRJN)
      if (history && history.length > 0 && symbol !== 'GRJN') {
          return history.map(point => {
              const date = new Date(point.time * 1000);
              let label = "";

              if (timeRange === '1 día') {
                  const hours = date.getHours();
                  const mins = date.getMinutes();
                  // Formato HH:mm
                  label = `${hours}:${mins.toString().padStart(2, '0')}`;
              } else if (timeRange === '1 año' || timeRange === '5 años' || timeRange === 'MÁX.') {
                  // Formato Mes Año
                  label = date.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
              } else {
                  // Formato Día Mes
                  label = date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
              }

              return {
                  time: label,
                  value: point.value,
                  volume: point.volume,
                  dateFull: date.toLocaleString('es-CO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: timeRange === '1 día' ? 'numeric' : undefined,
                      minute: timeRange === '1 día' ? 'numeric' : undefined
                  })
              };
          });
      }
      
      // Prioridad 2: Simulación Personalizada para GRJN (Tendencia Alcista Suave)
      if (symbol === 'GRJN') {
          const points = 50;
          const startPrice = 0.1180; // Empieza un poco más bajo
          const endPrice = 0.1200;   // Termina en el precio actual
          const simulatedData = [];
           
          for (let i = 0; i < points; i++) {
              // Interpolación lineal con un poco de ruido para realismo
              const progress = i / (points - 1);
              const trend = startPrice + (endPrice - startPrice) * progress;
              // Ruido aleatorio muy pequeño (+/- 0.0002)
              const noise = (Math.random() - 0.5) * 0.0002;
              const value = trend + noise;
              
              // Generar hora simulada para hoy
              const date = new Date();
              date.setHours(9 + Math.floor((i / points) * 7)); // 9 AM a 4 PM
              date.setMinutes(Math.floor(((i / points) * 7 * 60) % 60));

              simulatedData.push({
                  time: `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`,
                  value: value,
                  volume: Math.floor(Math.random() * 50) + 10,
                  dateFull: date.toLocaleString('es-CO')
              });
          }
          return simulatedData;
      }

      // Prioridad 3: Simulación Genérica (Fallback)
      return generateDataForRange(timeRange, price, previousClose);
  }, [history, timeRange, price, previousClose]);

  // Estado de carga o error
  if (!data) {
      if (loading) {
          return (
              <div className="flex h-screen items-center justify-center bg-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                  <span className="ml-3 text-slate-500 font-medium">Cargando información...</span>
              </div>
          );
      }
      return (
          <div className="flex h-screen items-center justify-center bg-white">
              <span className="text-red-500 font-medium">No se pudo cargar la información de {symbol}</span>
          </div>
      );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4 animate-in fade-in duration-500 pb-24 font-sans bg-white min-h-screen">
      
      {/* 1. BREADCRUMBS */}
      <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 uppercase tracking-wide">
          <span onClick={() => navigate('/inversiones')} className="cursor-pointer hover:underline">INICIO</span>
          <ChevronRight size={12} />
          <span>{symbol}</span>
          <ChevronRight size={12} />
          <span>NASDAQ</span>
      </div>

      {/* 2. HEADER PRINCIPAL */}
      <div className="border-b border-slate-100 pb-6">
        <h1 className="text-[28px] leading-tight font-normal text-[#202124] mb-1">
            {symbol} Corporation
        </h1>
        
        <div className="flex flex-wrap items-baseline gap-3 mb-2">
            <span className="text-[36px] font-normal text-[#202124] tracking-tight">
                {price.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
            </span>
            
            {/* BADGE DE CAMBIO */}
            <div className={`flex items-center gap-1 text-[16px] font-medium ${isPositive ? 'text-[#137333]' : 'text-[#a50e0e]'}`}>
                {isPositive ? <ArrowUpRight size={20} strokeWidth={2.5} /> : <ArrowDownRight size={20} strokeWidth={2.5} />}
                <span>{Math.abs(percent).toFixed(2)}%</span>
                <span className="ml-1">{change > 0 ? '+' : ''}{change.toFixed(2)} Hoy</span>
            </div>
        </div>

        <div className="text-[12px] text-[#5f6368] space-y-1">
            <p className="flex gap-1">
                <span>Después del cierre:</span>
                <span className="text-[#202124] font-bold">{price.toFixed(2)} $</span> 
                <span className="text-[#137333]">(0,099 %)</span>
                <span className="text-[#137333]">+0,050</span>
            </p>
            <p>Cerrados: {new Date().toLocaleDateString()} • USD • NASDAQ • Renuncia de responsabilidad</p>
        </div>
        
        {/* 3. TABS DE TIEMPO */}
        <div className="flex gap-6 mt-6 w-full overflow-x-auto no-scrollbar">
            {['1 día', '5 D', '1 mes', '6 M', 'YTD', '1 año', '5 años', 'MÁX.'].map((r) => (
                <button 
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`text-[13px] pb-3 transition-colors relative whitespace-nowrap ${
                        timeRange === r 
                        ? 'text-[#1967d2] font-medium after:absolute after:bottom-0 after:left-0 after:w-full after:h-[3px] after:bg-[#1967d2] after:rounded-t-sm' 
                        : 'text-[#5f6368] hover:text-[#202124] font-medium'
                    }`}
                >
                    {r}
                </button>
            ))}
        </div>
      </div>

      {/* 4. CONTENIDO: GRÁFICO + INFO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-2">
        
        {/* COLUMNA IZQUIERDA: GRÁFICO (2/3) */}
        <div className="lg:col-span-2">
            <div className="h-[320px] w-full bg-white relative group">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            {/* GRADIENTE LINEA: Verde -> Gris */}
                            <linearGradient id="colorStrokeDetailed" x1="0" y1="0" x2="1" y2="0">
                                <stop offset={timeRange === '1 día' ? MARKET_CLOSE_OFFSET : 1} stopColor={isPositive ? "#137333" : "#d93025"} stopOpacity={1}/>
                                <stop offset={timeRange === '1 día' ? MARKET_CLOSE_OFFSET : 1} stopColor="#dadce0" stopOpacity={1}/>
                            </linearGradient>
                            
                            {/* GRADIENTE RELLENO: Verde -> Transparente */}
                            {/* GRADIENTE RELLENO: Horizontal con corte abrupto al cierre de mercado */}
                            <linearGradient id="colorFillDetailed" x1="0" y1="0" x2="1" y2="0">
                                <stop offset={timeRange === '1 día' ? MARKET_CLOSE_OFFSET : 1} stopColor={isPositive ? "#137333" : "#d93025"} stopOpacity={0.15}/>
                                <stop offset={timeRange === '1 día' ? MARKET_CLOSE_OFFSET : 1} stopColor="#ffffff" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                        
                        <XAxis 
                            dataKey="time" 
                            axisLine={{ stroke: '#dadce0' }} 
                            tickLine={{ stroke: '#dadce0', height: 4 }} 
                            tick={{fontSize: 11, fill: '#5f6368', dy: 5}}
                            ticks={timeRange === '1 día' ? ['12:00', '15:00', '18:00'] : null} 
                            interval={timeRange === '1 día' ? 0 : Math.ceil(chartData.length / 6)}
                            dy={10}
                        />
                        
                        <YAxis 
                            domain={['auto', 'auto']} 
                            orientation="left" 
                            axisLine={false}
                            tickLine={false}
                            tick={{fontSize: 11, fill: '#5f6368'}}
                            tickFormatter={(val) => val.toFixed(2).replace('.', ',')}
                            width={45}
                        />
                        
                        <Tooltip 
                            content={<CustomTooltip />}
                            cursor={{ stroke: '#9aa0a6', strokeWidth: 1, strokeDasharray: '3 3' }}
                        />
                        
                        {/* LÍNEA DE CRUCE PUNTEADA (Previous Close) */}
                        {timeRange === '1 día' && (
                            <ReferenceLine y={previousClose} stroke="#9aa0a6" strokeDasharray="3 3" />
                        )}

                        <Area 
                            type="linear" 
                            dataKey="value" 
                            stroke="url(#colorStrokeDetailed)" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorFillDetailed)" 
                            animationDuration={600}
                            dot={<CustomizedDot data={chartData} stroke={isPositive ? "#137333" : "#d93025"} />}
                            activeDot={{ r: 5, fill: isPositive ? "#137333" : "#d93025", stroke: '#fff', strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
                
                 {timeRange === '1 día' && (
                     <div className="absolute bottom-[30px] right-0 text-right">
                         <div className="text-[10px] text-[#5f6368] mb-0.5">Cierre:</div>
                         <div className="text-[14px] text-[#202124]">{price.toFixed(2)} $</div>
                     </div>
                 )}
            </div>

             {/* CARRUSEL DE ACCIONES RELACIONADAS (Estilo Google Finance) */}
             <div className="mt-6 relative group">
                <div className="flex justify-between items-center mb-3 px-1">
                    <h3 className="text-[#202124] text-[16px] font-normal">Otras empresas</h3>
                    <div className="hidden md:flex gap-1">
                        <button onClick={() => scroll('left')} className="p-1 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={() => scroll('right')} className="p-1 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
                
                <div 
                    ref={scrollRef}
                    className="flex gap-3 overflow-x-auto pb-4 no-scrollbar snap-x overscroll-x-contain touch-pan-x w-full"
                >
                    {RELATED_SYMBOLS.map(sym => (
                        <RelatedStockCard key={sym} symbol={sym} currentSymbol={symbol} />
                    ))}
                </div>
             </div>
        </div>

        {/* COLUMNA DERECHA: ESTADÍSTICAS (Estilo Google Finance) */}
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-[#dadce0] overflow-hidden shadow-sm">
                
                {/* 1. Header de la tarjeta */}
                <div className="flex flex-wrap gap-2 p-4 border-b border-[#dadce0]">
                    <span className="px-3 py-1 bg-white text-[#1967d2] rounded-full text-[12px] font-medium border border-[#dadce0] flex items-center gap-1 shadow-sm">
                        <ArrowUpRight size={14} /> Mayor actividad
                    </span>
                    <span className="px-3 py-1 bg-[#f1f3f4] text-[#3c4043] rounded-full text-[12px] font-medium border border-transparent">Acción</span>
                    <span className="px-3 py-1 bg-[#f1f3f4] text-[#3c4043] rounded-full text-[12px] font-medium border border-transparent">Valor cotizado en EE. UU.</span>
                    <span className="px-3 py-1 bg-[#f1f3f4] text-[#3c4043] rounded-full text-[12px] font-medium border border-transparent">Sede en EE. UU.</span>
                </div>
                
                {/* 2. Tabla de Datos */}
                <div className="px-5 py-2">
            
            
                    {/* FILA 1: CIERRE ANTERIOR */}

                    {/* FILA 1: CIERRE ANTERIOR */}
                    <div className="flex justify-between items-center py-3 border-b border-[#f1f3f4]">
                        <span className="text-[11px] text-[#5f6368] font-bold uppercase tracking-wider">Cierre anterior</span>
                        <span className="text-[14px] text-[#202124] font-medium">
                            {(data?.prevClose || previousClose).toLocaleString('es-CO', { minimumFractionDigits: 2 })} $
                        </span>
                    </div>

                    {/* FILA 2: INTERVALO DIARIO */}
                    <div className="flex justify-between items-center py-3 border-b border-[#f1f3f4]">
                        <span className="text-[11px] text-[#5f6368] font-bold uppercase tracking-wider">Intervalo diario</span>
                        <span className="text-[14px] text-[#202124] font-medium">
                            {(data?.low || price * 0.98).toLocaleString('es-CO', { minimumFractionDigits: 2 })} $ - {(data?.high || price * 1.02).toLocaleString('es-CO', { minimumFractionDigits: 2 })} $
                        </span>
                    </div>

                    {/* FILA 3: INTERVALO ANUAL */}
                    <div className="flex justify-between items-center py-3 border-b border-[#f1f3f4]">
                        <span className="text-[11px] text-[#5f6368] font-bold uppercase tracking-wider">Intervalo anual</span>
                        <span className="text-[14px] text-[#202124] font-medium">
                             {(price * 0.7).toLocaleString('es-CO', { minimumFractionDigits: 2 })} $ - {(price * 1.3).toLocaleString('es-CO', { minimumFractionDigits: 2 })} $
                        </span>
                    </div>

                    {/* FILA 4: CAP. BURSÁTIL */}
                    <div className="flex justify-between items-center py-3 border-b border-[#f1f3f4]">
                        <span className="text-[11px] text-[#5f6368] font-bold uppercase tracking-wider">Cap. bursátil</span>
                        <span className="text-[14px] text-[#202124] font-medium">
                            {data?.marketCap || "250,95 mil M USD"}
                        </span>
                    </div>

                    {/* FILA 5: VOLUMEN MEDIO */}
                    <div className="flex justify-between items-center py-3 border-b border-[#f1f3f4]">
                        <span className="text-[11px] text-[#5f6368] font-bold uppercase tracking-wider">Volumen medio</span>
                        <span className="text-[14px] text-[#202124] font-medium">
                            124,86 M
                        </span>
                    </div>

                    {/* FILA 6: P/E */}
                    <div className="flex justify-between items-center py-3 border-b border-[#f1f3f4]">
                        <span className="text-[11px] text-[#5f6368] font-bold uppercase tracking-wider">Relación precio-beneficio</span>
                        <span className="text-[14px] text-[#202124] font-medium">
                            {data?.pe || "-"}
                        </span>
                    </div>

                    {/* FILA 7: DIVIDENDOS */}
                    <div className="flex justify-between items-center py-3 border-b border-[#f1f3f4]">
                        <span className="text-[11px] text-[#5f6368] font-bold uppercase tracking-wider">Rentabilidad por dividendo</span>
                        <span className="text-[14px] text-[#202124] font-medium">
                            {data?.dividend ? `${data.dividend}%` : "-"}
                        </span>
                    </div>

                     {/* FILA 8: BOLSA */}
                     <div className="flex justify-between items-center py-3">
                        <span className="text-[11px] text-[#5f6368] font-bold uppercase tracking-wider">Bolsa de valores principal</span>
                        <span className="text-[14px] text-[#202124] font-bold uppercase">
                            NASDAQ
                        </span>
                    </div>
                </div>
            </div>

            {/* SECCIÓN SOBRE LA EMPRESA */}
            <div className="bg-white rounded-lg border border-[#dadce0] overflow-hidden shadow-sm transition-all duration-300">
                <div 
                    className="p-4 border-b border-[#dadce0] flex justify-between items-center bg-white cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setIsCompanyInfoOpen(!isCompanyInfoOpen)}
                >
                    <h3 className="text-[#202124] text-[16px] font-normal select-none">Información sobre la empresa</h3>
                    <ChevronRight 
                        size={20} 
                        className={`text-[#5f6368] transition-transform duration-300 ${isCompanyInfoOpen ? 'rotate-90' : ''}`} 
                    />
                </div>
                
                {/* Contenido Colapsable */}
                <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${isCompanyInfoOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-5 space-y-5">
                    <p className="text-[14px] text-[#3c4043] leading-relaxed">
                        {data?.description}
                        {data?.wiki_url && (
                            <a href={data.wiki_url} target="_blank" rel="noopener noreferrer" className="text-[#1a73e8] ml-1 hover:underline">
                                Wikipedia
                            </a>
                        )}
                    </p>
                    
                    <div className="pt-2 grid grid-cols-1 space-y-4">
                        <div className="flex items-center gap-4 border-b border-[#f1f3f4] pb-3">
                            <div className="w-5 text-center"><span className="text-[#5f6368]"><User size={18} /></span></div>
                            <div className="flex-1">
                                <p className="text-[11px] text-[#5f6368] font-bold uppercase tracking-wider mb-0.5">Director ejecutivo</p>
                                <p className="text-[14px] text-[#1a73e8] font-medium cursor-pointer hover:underline">{data?.ceo || "-"}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 border-b border-[#f1f3f4] pb-3">
                            <div className="w-5 text-center"><span className="text-[#5f6368]"><Calendar size={18} /></span></div>
                            <div className="flex-1">
                                <p className="text-[11px] text-[#5f6368] font-bold uppercase tracking-wider mb-0.5">Fundación</p>
                                <p className="text-[14px] text-[#202124] font-medium">{data?.founded || "-"}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 border-b border-[#f1f3f4] pb-3">
                            <div className="w-5 text-center"><span className="text-[#5f6368]"><MapPin size={18} /></span></div>
                            <div className="flex-1">
                                <p className="text-[11px] text-[#5f6368] font-bold uppercase tracking-wider mb-0.5">Sede</p>
                                <p className="text-[14px] text-[#1a73e8] font-medium cursor-pointer hover:underline">{data?.hq || "-"}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 border-b border-[#f1f3f4] pb-3">
                            <div className="w-5 text-center"><span className="text-[#5f6368]"><Globe size={18} /></span></div>
                            <div className="flex-1">
                                <p className="text-[11px] text-[#5f6368] font-bold uppercase tracking-wider mb-0.5">Sitio web</p>
                                <a href={`https://${data?.website}`} target="_blank" rel="noopener noreferrer" className="text-[#1a73e8] font-medium hover:underline">
                                    {data?.website || "-"}
                                </a>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-5 text-center"><span className="text-[#5f6368]"><Users size={18} /></span></div>
                            <div className="flex-1">
                                <p className="text-[11px] text-[#5f6368] font-bold uppercase tracking-wider mb-0.5">Empleados</p>
                                <p className="text-[14px] text-[#202124] font-medium">{data?.employees || "-"}</p>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}

// SUB-COMPONENTE PARA TARJETA DE ACCIÓN
const RelatedStockCard = ({ symbol, currentSymbol }) => {
    const navigate = useNavigate();
    const { data } = useFinnhub(symbol);
    
    // No mostramos la tarjeta si es la misma acción que estamos viendo
    if (symbol === currentSymbol) return null;

    const price = data?.price || 0;
    const change = data?.change || 0;
    const percent = data?.percent || 0;
    const isPositive = percent >= 0;

    return (
        <div 
            onClick={() => navigate(`/inversiones/${symbol}`)}
            className="min-w-[140px] md:min-w-[160px] p-3 border border-[#dadce0] rounded-lg bg-white cursor-pointer hover:shadow-md transition-shadow snap-start flex flex-col justify-between h-[80px]"
        >
            <div className="flex justify-between items-start">
                 <span className="text-[12px] font-bold text-[#5f6368]">{symbol}</span>
                 {/* Mini gráfico visual (simulado con color) */}
                 <div className={`w-8 h-4 rounded-sm ${isPositive ? 'bg-green-100' : 'bg-red-100'}`}></div>
            </div>
            
            <div className="mt-1">
                <div className="text-[14px] font-medium text-[#202124]">{price.toFixed(2)} $</div>
                <div className={`text-[12px] font-medium flex items-center gap-0.5 ${isPositive ? 'text-[#137333]' : 'text-[#a50e0e]'}`}>
                    {isPositive ? <ArrowUpRight size={12} strokeWidth={3} /> : <ArrowDownRight size={12} strokeWidth={3} />}
                    {Math.abs(percent).toFixed(2)} %
                </div>
            </div>
        </div>
    );
};


