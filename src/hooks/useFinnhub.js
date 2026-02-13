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
          high: result.h,
          low: result.l,
          open: result.o,
          prevClose: result.pc,
          marketCap: "-", // API básica no trae esto, se requeriría otro endpoint
          pe: "-",
          dividend: "-",
          isReal: true
        });

      } catch (err) {
        // FALLBACK: Datos simulados si falla la API o no hay Key
        console.warn(`Usando datos simulados para ${symbol} (Razón: ${err.message})`);
        
        // SIMULACIÓN AVANZADA
        const basePrice = getBasePrice(symbol);
        const randomVar = (Math.random() * 2 - 1); 
        const simPrice = basePrice + randomVar;
        const simChange = (simPrice - basePrice);
        const simPercent = (simChange / basePrice) * 100;
        const low = simPrice - (Math.random() * 1.5);
        const high = simPrice + (Math.random() * 1.5);
        const open = basePrice;
        const prevClose = basePrice;
        const STOCK_METADATA = {
             'GRJN': {
                name: "Grupo Jenta",
                ceo: "Tavito Jenta",
                founded: "18 jul 2024",
                hq: "Medellín, Colombia",
                website: "jenta.co",
                employees: "1.250",
                search_term: "Grupo Jenta"
            },
            'AAPL': {
                name: "Apple Inc.",
                ceo: "Tim Cook",
                founded: "1 abr 1976",
                hq: "Cupertino (California), Estados Unidos",
                website: "apple.com",
                employees: "164.000",
                search_term: "Apple Inc."
            },
            'TSLA': {
                name: "Tesla, Inc.",
                ceo: "Elon Musk",
                founded: "1 jul 2003",
                hq: "Austin (Texas), Estados Unidos",
                website: "tesla.com",
                employees: "127.855",
                search_term: "Tesla Motors"
            },
            'MSFT': {
                name: "Microsoft Corp.",
                ceo: "Satya Nadella",
                founded: "4 abr 1975",
                hq: "Redmond (Washington), Estados Unidos",
                website: "microsoft.com",
                employees: "221.000",
                search_term: "Microsoft"
            },
            'AMZN': {
                name: "Amazon.com, Inc.",
                ceo: "Andy Jassy",
                founded: "5 jul 1994",
                hq: "Seattle (Washington), Estados Unidos",
                website: "amazon.com",
                employees: "1.541.000",
                search_term: "Amazon (empresa)"
            },
            'GOOGL': {
                name: "Alphabet Inc.",
                ceo: "Sundar Pichai",
                founded: "4 sept 1998",
                hq: "Mountain View (California), Estados Unidos",
                website: "abc.xyz",
                employees: "190.234",
                search_term: "Alphabet Inc."
            },
             'INTC': {
                name: "Intel Corporation",
                ceo: "Pat Gelsinger",
                founded: "18 jul 1968",
                hq: "Santa Clara (California), Estados Unidos",
                website: "intel.com",
                employees: "131.900",
                search_term: "Intel"
            },
            'META': {
                name: "Meta Platforms, Inc.",
                ceo: "Mark Zuckerberg",
                founded: "4 feb 2004",
                hq: "Menlo Park (California), Estados Unidos",
                website: "meta.com",
                employees: "66.185",
                search_term: "Meta Platforms"
            },
            'NVDA': {
                name: "NVIDIA Corp.",
                ceo: "Jensen Huang",
                founded: "5 abr 1993",
                hq: "Santa Clara (California), Estados Unidos",
                website: "nvidia.com",
                employees: "26.196",
                search_term: "Nvidia"
            },
            'NFLX': {
                name: "Netflix, Inc.",
                ceo: "Ted Sarandos",
                founded: "29 ago 1997",
                hq: "Los Gatos (California), Estados Unidos",
                website: "netflix.com",
                employees: "12.800",
                search_term: "Netflix"
            }
        };

        const safeSymbol = (symbol || "").toUpperCase().trim();
        const staticData = STOCK_METADATA[safeSymbol] || STOCK_METADATA[symbol];
        
        let finalProfile = {
            name: staticData?.name || symbol,
            description: "Cargando información actualizada de Wikipedia...",
            ceo: staticData?.ceo || "-",
            founded: staticData?.founded || "-",
            hq: staticData?.hq || "-",
            website: staticData?.website || "-",
            employees: staticData?.employees || "-"
        };

        // INTEGRACIÓN WIKIPEDIA AUTOMÁTICA
        try {
            // Determinar término de búsqueda: nombre de la empresa o el símbolo si no hay datos
            // Priorizamos el término de búsqueda manual si existe (ej. "Alphabet Inc." para GOOGL)
            const searchTerm = staticData?.search_term || `${symbol} empresa`;
            
            // 1. Buscar página
            const searchRes = await fetch(`https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&origin=*`);
            const searchData = await searchRes.json();
            
            if (searchData.query?.search?.length > 0) {
                const result = searchData.query.search[0];
                const title = result.title;
                const pageId = result.pageid;

                // Generamos URL real basada en el título encontrado
                finalProfile.wiki_url = `https://es.wikipedia.org/wiki/${encodeURIComponent(title)}`;
                finalProfile.name = title; // Actualizamos nombre con el oficial de Wiki
                
                // 2. Obtener extracto corto
                const summaryRes = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
                const summaryData = await summaryRes.json();

                if (summaryData.extract) {
                    finalProfile.description = summaryData.extract;
                } else {
                    finalProfile.description = "Descripción disponible en Wikipedia (sin extracto).";
                }

                // Fallback robusto si data estructurada nula
                if (!staticData) {
                    finalProfile.ceo = "Ver en Wikipedia";
                    finalProfile.founded = "Ver en Wikipedia";
                    finalProfile.hq = "Ver en Wikipedia";
                    finalProfile.website = "wikipedia.org";
                }

            } else {
                 finalProfile.description = `No se encontró información en Wikipedia para la búsqueda: "${searchTerm}".`;
                 finalProfile.wiki_url = `https://es.wikipedia.org/w/index.php?search=${symbol}`;
            }

            // Excepción especial para GRJN 
            if (safeSymbol === 'GRJN') {
                 finalProfile.description = "Grupo Jenta es una empresa líder en tecnología e innovación digital, enfocada en soluciones de comercio electrónico y servicios financieros integrados. Con sede en Colombia, la compañía ha revolucionado el mercado local con su plataforma unificada.";
                 finalProfile.wiki_url = "https://jenta.co";
            }

        } catch (e) {
            console.error("Error fetching Wikipedia data:", e);
            finalProfile.description = "No se pudo cargar la información externa. Verifica tu conexión.";
            finalProfile.wiki_url = `https://es.wikipedia.org/w/index.php?search=${symbol}`;
            
            // Si falló wiki y no tenemos datos estáticos, al menos ponemos algo
            if (!staticData && finalProfile.ceo === "-") {
                 finalProfile.ceo = "Error de conexión";
                 finalProfile.founded = "Desconocido";
            }
        }

        // ASEGURAR que descripción no sea undefined
        if (!finalProfile.description || finalProfile.description.trim() === "") {
            finalProfile.description = "Información no disponible temporalmente.";
        }

        setData({
          price: simPrice,
          change: simChange,
          percent: simPercent,
          high: high,
          low: low,
          open: open,
          prevClose: prevClose,
          marketCap: "2.5T", 
          pe: 28.5, 
          dividend: 0.85, 
          ...finalProfile,
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
    if (prices[symbol]) return prices[symbol];

    // GENERADOR DETERMINISTA DE PRECIO BASE (Hash simple del string)
    // Para que siempre que cargue "IBM" tenga el mismo precio base, pero distinto a "KO"
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
        hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Convertir hash a positivo y mapear a rango $50 - $500
    const positiveHash = Math.abs(hash);
    const randomPrice = (positiveHash % 450) + 50; 
    
    return randomPrice;
}
