import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import type { FlipkartOrder } from '../types';

export const syncFlipkartOrders = async (filterDate?: string) => {
    const syncFunc = httpsCallable<{ filterDate?: string }, { success: boolean; orders: any[] }>(functions, 'syncFlipkartOrders');

    try {
        const result = await syncFunc({ filterDate });
        return result.data;
    } catch (error) {
        console.error('Error calling syncFlipkartOrders:', error);
        throw error;
    }
};
