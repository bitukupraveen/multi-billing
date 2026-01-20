import { db } from '../firebase/config';
import { doc, runTransaction } from 'firebase/firestore';

export const generateNextInvoiceId = async (channel: string = 'OFFLINE'): Promise<string> => {
    // Determine prefix based on channel
    let prefix = 'INV';
    let counterDocId = 'invoices'; // Default counter

    switch (channel) {
        case 'FLIPKART':
            prefix = 'FLIP';
            counterDocId = 'invoices_flipkart';
            break;
        case 'AMAZON':
            prefix = 'AMZ';
            counterDocId = 'invoices_amazon';
            break;
        case 'MEESHO':
            prefix = 'MES';
            counterDocId = 'invoices_meesho';
            break;
        case 'WEBSITE':
            prefix = 'WEB';
            counterDocId = 'invoices_website';
            break;
        default:
            prefix = 'INV';
            counterDocId = 'invoices_offline';
            break;
    }

    const counterRef = doc(db, 'counters', counterDocId);

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

        // Format: PRE001
        // Pad with zeros for consistency
        return `${prefix}${newId.toString().padStart(4, '0')}`;
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
