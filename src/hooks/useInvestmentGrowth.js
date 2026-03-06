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
                        const iterationDate = new Date(lastUpdate.getTime() + ((i + 1) * 24 * 60 * 60 * 1000));

                        const seedDate = iterationDate.toISOString().split('T')[0];
                        let hash = 0;
                        for (let k = 0; k < seedDate.length; k++) {
                            hash = ((hash << 5) - hash) + seedDate.charCodeAt(k);
                            hash |= 0;
                        }
                        const pseudoRandom = Math.abs(Math.sin(hash));
                        const isNegativeDay = pseudoRandom < 0.15; // 15% chance de día rojo

                        let dailyRate = 0;
                        if (isNegativeDay) {
                            // Día Rojo: Pierden entre -0.05% y -0.15% (Visualmente estresante pero controlado)
                            dailyRate = -(Math.random() * (0.0015 - 0.0005) + 0.0005);
                        } else {
                            // Día Verde: Ganan entre +0.06% y +0.09% (Compensa las pérdidas para llegar al 1.6% mensual)
                            dailyRate = Math.random() * (0.0009 - 0.0006) + 0.0006;
                        }

                        const growth = newBalance * dailyRate;
                        newBalance += growth;

                        historyLog.push({
                            date: iterationDate,
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
