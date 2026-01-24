import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

export const syncWixProducts = async () => {
    const syncFunc = httpsCallable<any, { success: boolean; products: any[] }>(functions, 'syncWixProducts');
    try {
        const result = await syncFunc();
        return result.data;
    } catch (error) {
        console.error('Error calling syncWixProducts:', error);
        throw error;
    }
};

export const syncWixOrders = async () => {
    const syncFunc = httpsCallable<any, { success: boolean; orders: any[] }>(functions, 'syncWixOrders');
    try {
        const result = await syncFunc();
        return result.data;
    } catch (error) {
        console.error('Error calling syncWixOrders:', error);
        throw error;
    }
};
