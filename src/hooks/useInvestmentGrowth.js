import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Hook para simular crecimiento de inversión diario (1.5% - 1.7% mensual)
 * Matemáticas: 
 * - Objetivo mensual: ~1.6%
 * - Tasa diaria promedio: ~0.053% (0.00053)
 * - Rango diario: 0.04% - 0.07% (0.0004 - 0.0007)
 */
export const useInvestmentGrowth = (userId) => {
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (!userId) return;

        const checkAndApplyGrowth = async () => {
            setIsUpdating(true);
            try {
                const userRef = doc(db, "clients", userId);
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) return;

                const data = userSnap.data();
                const currentBalance = data.investmentBalance || 0;
                
                // Si no hay saldo, no hay crecimiento
                if (currentBalance <= 0) {
                    setIsUpdating(false);
                    return;
                }

                const now = new Date();
                // Si no existe lastUpdate, asumimos que es hoy (empieza la inversión)
                const lastUpdate = data.lastInvestmentUpdate ? data.lastInvestmentUpdate.toDate() : now;

                // Calcular días completos pasados
                const diffTime = Math.abs(now - lastUpdate);
                const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                if (daysPassed > 0) {
                    let newBalance = currentBalance;
                    const historyLog = [];

                    // Simular día por día para interés compuesto real
                    for (let i = 0; i < daysPassed; i++) {
                        // Tasa aleatoria entre 0.04% y 0.07%
                        // Math.random() * (max - min) + min
                        const dailyRate = Math.random() * (0.0007 - 0.0004) + 0.0004;
                        const growth = newBalance * dailyRate;
                        newBalance += growth;
                        
                        historyLog.push({
                            date: new Date(lastUpdate.getTime() + ((i + 1) * 24 * 60 * 60 * 1000)),
                            rate: dailyRate,
                            growth: growth,
                            balance: newBalance
                        });
                    }

                    // Actualizar en Firestore
                    await updateDoc(userRef, {
                        investmentBalance: newBalance,
                        lastInvestmentUpdate: now // Actualizamos a 'ahora'
                    });

                    console.log(`[InvGrowth] Actualizado por ${daysPassed} días. Nuevo saldo: ${newBalance.toFixed(2)}`);
                }

            } catch (error) {
                console.error("Error aplicando crecimiento de inversión:", error);
            } finally {
                setIsUpdating(false);
            }
        };

        checkAndApplyGrowth();
    }, [userId]);

    return { isUpdating };
};
