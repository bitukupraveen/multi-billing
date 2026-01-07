import { db } from '../firebase/config';
import { doc, runTransaction } from 'firebase/firestore';

export const generateNextInvoiceId = async (): Promise<string> => {
    const counterRef = doc(db, 'counters', 'invoices');

    try {
        const newId = await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);

            let currentCount = 0;
            if (counterDoc.exists()) {
                currentCount = counterDoc.data().count || 0;
            }

            const nextCount = currentCount + 1;
            transaction.set(counterRef, { count: nextCount });

            return nextCount;
        });

        // Format: INV1, INV2...
        return `INV${newId}`;
    } catch (error) {
        console.error("Error generating invoice ID:", error);
        throw error;
    }
};

export const generateNextPurchaseId = async (): Promise<string> => {
    const counterRef = doc(db, 'counters', 'purchases');

    try {
        const newId = await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);

            let currentCount = 0;
            if (counterDoc.exists()) {
                currentCount = counterDoc.data().count || 0;
            }

            const nextCount = currentCount + 1;
            transaction.set(counterRef, { count: nextCount });

            return nextCount;
        });

        // Format: PRC1, PRC2...
        return `PRC${newId}`;
    } catch (error) {
        console.error("Error generating purchase ID:", error);
        throw error;
    }
};
