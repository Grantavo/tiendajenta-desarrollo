import { useState, useEffect, useCallback } from 'react';

// 🔑 CLAVE DE API (Gratis en finnhub.io)
// Por ahora usamos una DEMO o dejalo vacío para ver datos simulados.
const API_KEY = ""; 

const getResolutionAndTimes = (range) => {
    const to = Math.floor(Date.now() / 1000);
    let from = to;
    let resolution = 'D';

    switch(range) {
        case '1 día':
            from = to - (24 * 3600); // 1 día (aunque mercado es menos)
            resolution = '5'; // 5 minutos
            break;
        case '5 D':
            from = to - (5 * 24 * 3600);
            resolution = '15'; // 15 minutos
            break;
        case '1 mes':
            from = to - (30 * 24 * 3600);
            resolution = '60'; // 1 hora
            break;
        case '6 M':
            from = to - (180 * 24 * 3600);
            resolution = 'D'; // Diario
            break;
        case 'YTD':
            const startOfYear = new Date(new Date().getFullYear(), 0, 1);
            from = Math.floor(startOfYear.getTime() / 1000);
            resolution = 'D';
            break;
        case '1 año':
            from = to - (365 * 24 * 3600);
            resolution = 'D';
            break;
        case '5 años':
            from = to - (5 * 365 * 24 * 3600);
            resolution = 'W'; // Semanal
            break;
        case 'MÁX.':
            from = to - (10 * 365 * 24 * 3600); // 10 años aprox
            resolution = 'M'; // Mensual
            break;
        default:
            from = to - (24 * 3600);
            resolution = '5';
    }
    return { resolution, from, to };
};

export const useFinnhub = (symbol) => {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState(null); // Nuevo estado para historial
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (!API_KEY) throw new Error("No API Key");

        const response = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`
        );
        
        if (!response.ok) throw new Error("API Error");
        
        const result = await response.json();
        
        setData({
          price: result.c,
          change: result.d,
          percent: result.dp,
          isReal: true
        });

      } catch (err) {
        // FALLBACK: Datos simulados si falla la API o no hay Key
        console.warn(`Usando datos simulados para ${symbol} (Razón: ${err.message})`);
        
        const basePrice = getBasePrice(symbol);
        const randomVar = (Math.random() * 2 - 1); 
        const simPrice = basePrice + randomVar;
        const simChange = (simPrice - basePrice);
        const simPercent = (simChange / basePrice) * 100;

        setData({
          price: simPrice,
          change: simChange,
          percent: simPercent,
          isReal: false
        });
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  // Nueva función para obtener o simular historial (memoizada)
  const fetchHistory = useCallback(async (range) => {
      setHistoryLoading(true);
      const { resolution, from, to } = getResolutionAndTimes(range);

      try {
          if (!API_KEY) throw new Error("No API Key for History");

          const response = await fetch(
              `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${API_KEY}`
          );
          
          if (!response.ok) throw new Error("History API Error");
          
          const result = await response.json();
          
          if (result.s === "ok") {
              // Mapear respuesta {c: [], t: [], ...} a nuestro formato
              const formattedHistory = result.t.map((timestamp, index) => ({
                  time: timestamp, // Unix timestamp
                  value: result.c[index],
                  volume: result.v ? result.v[index] : 0
              }));
              setHistory(formattedHistory);
          } else {
              throw new Error("No Data");
          }

      } catch (err) {
          console.warn(`Simulando historial para ${range} (${err.message})`);
          // Si falla, retornamos null para que el componente use su generador simulado interno o uno nuevo aquí
          setHistory(null); 
      } finally {
          setHistoryLoading(false);
      }
  }, [symbol]);

  return { data, loading, error, history, fetchHistory, historyLoading };
};

// Precios base para la simulación
function getBasePrice(symbol) {
    const prices = {
        'AAPL': 185.00,
        'TSLA': 240.00,
        'BTC': 45000.00,
        'AMZN': 145.00,
        'GOOGL': 140.00
    };
    return prices[symbol] || 100.00;
}
