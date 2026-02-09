import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { ArrowUpRight, ArrowDownRight, ChevronRight, Share2, Plus, GripHorizontal } from 'lucide-react';
import { useFinnhub } from '../../hooks/useFinnhub';

// CONSTANTES Y CONFIGURACIÓN
const MARKET_OPEN_MINUTES = 9.5 * 60; // 9:30 AM
const MARKET_CLOSE_MINUTES = 16 * 60; // 4:00 PM
const EXTENDED_CLOSE_MINUTES = 18.5 * 60; // 6:30 PM (Para mostrar after-hours)

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

  const [timeRange, setTimeRange] = useState('1 día');
  
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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4 animate-in fade-in duration-500 pb-24 font-sans bg-white min-h-screen">
      
      {/* 1. BREADCRUMBS */}
      <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 uppercase tracking-wide">
          <span onClick={() => navigate(-1)} className="cursor-pointer hover:underline">INICIO</span>
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
        </div>

        {/* COLUMNA DERECHA: ESTADÍSTICAS */}
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-[#dadce0] p-0 shadow-sm overflow-hidden">
                
                {/* Header de la tarjeta */}
                <div className="flex gap-2 p-3 border-b border-[#dadce0]">
                    <span className="px-3 py-1 bg-[#f1f3f4] text-[#3c4043] rounded-full text-[11px] font-medium border border-[#dadce0]">ETF</span>
                    <span className="px-3 py-1 bg-[#f1f3f4] text-[#3c4043] rounded-full text-[11px] font-medium border border-[#dadce0]">Valor cotizado en EE. UU.</span>
                </div>
                
                <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center text-[12px] border-b border-[#f1f3f4] pb-2">
                        <span className="text-[#5f6368] font-bold uppercase tracking-wider">Cierre anterior</span>
                        <span className="text-[#202124] font-medium">
                            {previousClose.toLocaleString(undefined, { minimumFractionDigits: 2 })} $
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-[12px] border-b border-[#f1f3f4] pb-2">
                        <span className="text-[#5f6368] font-bold uppercase tracking-wider">Intervalo diario</span>
                        <span className="text-[#202124] font-medium">
                            {(price * 0.98).toFixed(2)} $ - {(price * 1.02).toFixed(2)} $
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-[12px] border-b border-[#f1f3f4] pb-2">
                        <span className="text-[#5f6368] font-bold uppercase tracking-wider">Intervalo anual</span>
                        <span className="text-[#202124] font-medium">
                             {(price * 0.7).toFixed(2)} $ - {(price * 1.3).toFixed(2)} $
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-[12px] pt-1">
                        <span className="text-[#5f6368] font-bold uppercase tracking-wider">Volumen medio</span>
                        <span className="text-[#202124] font-medium">
                            84,86 M
                        </span>
                    </div>
                </div>
            </div>

            {/* BOTONES ACCIÓN */}
            <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-[#dadce0] text-[#1967d2] text-[13px] font-medium hover:bg-[#f8f9fa] transition">
                    <Plus size={18} /> Seguir
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-[#dadce0] text-[#1967d2] text-[13px] font-medium hover:bg-[#f8f9fa] transition">
                    <Share2 size={18} /> Compartir
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}
