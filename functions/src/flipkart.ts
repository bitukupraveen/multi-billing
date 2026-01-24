import * as functions from 'firebase-functions';
import axios from 'axios';

const FLIPKART_API_BASE = 'https://api.flipkart.net/sellers';
const FLIPKART_OAUTH_URL = 'https://api.flipkart.net/oauth-service/oauth/token';

const CREDENTIALS = {
    appId: '457886bba9013a651b115905050b696045ab',
    appSecret: '28c00c1ad811f98eff75db3012f5e3ac3'
};

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken() {
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
        return cachedToken.accessToken;
    }

    try {
        console.log('Fetching Flipkart Access Token (v3)...');
        const authHeader = Buffer.from(`${CREDENTIALS.appId}:${CREDENTIALS.appSecret}`).toString('base64');

        const response = await axios.get(FLIPKART_OAUTH_URL, {
            params: {
                grant_type: 'client_credentials',
                scope: 'Seller_Api'
            },
            headers: {
                Authorization: `Basic ${authHeader}`
            }
        });

        const { access_token, expires_in } = response.data;
        cachedToken = {
            accessToken: access_token,
            expiresAt: Date.now() + (expires_in - 60) * 1000 // Buffer of 60 seconds
        };

        return access_token;
    } catch (error: any) {
        const errorData = error.response?.data;
        console.error('Flipkart Auth Error (v3):', JSON.stringify(errorData || error.message));

        const errorMsg = errorData?.error_description || errorData?.message || error.message;
        throw new functions.https.HttpsError('unauthenticated', `Flipkart Auth Failed: ${errorMsg}`);
    }
}

export const syncFlipkartOrders = functions.https.onCall(async (data, context) => {
    try {
        const token = await getAccessToken();
        const { filterDate } = data;

        const fromDate = filterDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const toDate = new Date().toISOString();

        console.log(`Syncing Flipkart orders from ${fromDate}...`);

        const fetchShipments = async (type: string, states: string[]) => {
            try {
                const response = await axios.post(`${FLIPKART_API_BASE}/v3/shipments/filter`, {
                    type,
                    filter: {
                        states,
                        orderDate: { from: fromDate, to: toDate }
                    },
                    pagination: { pageSize: 50 }
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                return response.data.shipments || [];
            } catch (err: any) {
                console.error(`Flipkart ${type} Fetch Error:`, JSON.stringify(err.response?.data || err.message));
                throw err;
            }
        };

        const [preShipments, postShipments] = await Promise.all([
            fetchShipments("preDispatch", ["APPROVED", "PACKED", "READY_TO_DISPATCH"]),
            fetchShipments("postDispatch", ["SHIPPED", "DELIVERED", "PICKUP_COMPLETE"])
        ]);

        const allShipments = [...preShipments, ...postShipments];
        console.log(`Found ${preShipments.length} preDispatch and ${postShipments.length} postDispatch shipments.`);

        return {
            success: true,
            orders: allShipments.map((ship: any) => ({
                channel: 'Flipkart',
                orderId: ship.orderId,
                orderItemId: ship.orderItems?.[0]?.orderItemId || ship.orderId,
                dispatchedDate: ship.dispatchByDate || ship.orderDate,
                sku: ship.orderItems?.[0]?.sku || ship.orderId,
                quantity: ship.orderItems?.[0]?.quantity || 1,
                paymentMode: ship.payment?.type === 'PREPAID' ? 'Prepaid' : 'Postpaid',
                deliveryStatus: mapStatus(ship.status),
                sellerPrice: ship.payment?.totalAmount || 0,
                profitLoss: 0,
                bankSettlement: 0
            }))
        };

    } catch (error: any) {
        if (error instanceof functions.https.HttpsError) throw error;

        const errorData = error.response?.data;
        console.error('Flipkart API Error (v3):', JSON.stringify(errorData || error.message));
        const errorMsg = errorData?.message || JSON.stringify(errorData) || error.message;
        throw new functions.https.HttpsError('failed-precondition', `Flipkart Sync Failed: ${errorMsg}`);
    }
});

function mapStatus(flipkartStatus: string): string {
    switch (flipkartStatus) {
        case 'CANCELLED': return 'Cancellation';
        case 'RETURNED': return 'CustomerReturn';
        case 'COMPLETED': return 'Sale';
        default: return 'Sale';
    }
}
