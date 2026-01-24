"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncFlipkartOrders = void 0;
const functions = __importStar(require("firebase-functions"));
const axios_1 = __importDefault(require("axios"));
const FLIPKART_API_BASE = 'https://api.flipkart.net/sellers';
const FLIPKART_OAUTH_URL = 'https://api.flipkart.net/oauth-service/oauth/token';
const CREDENTIALS = {
    appId: '457886bba9013a651b115905050b696045ab',
    appSecret: '28c00c1ad811f98eff75db3012f5e3ac3'
};
let cachedToken = null;
async function getAccessToken() {
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
        return cachedToken.accessToken;
    }
    try {
        console.log('Fetching Flipkart Access Token (v3)...');
        const authHeader = Buffer.from(`${CREDENTIALS.appId}:${CREDENTIALS.appSecret}`).toString('base64');
        const response = await axios_1.default.get(FLIPKART_OAUTH_URL, {
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
    }
    catch (error) {
        const errorData = error.response?.data;
        console.error('Flipkart Auth Error (v3):', JSON.stringify(errorData || error.message));
        const errorMsg = errorData?.error_description || errorData?.message || error.message;
        throw new functions.https.HttpsError('unauthenticated', `Flipkart Auth Failed: ${errorMsg}`);
    }
}
exports.syncFlipkartOrders = functions.https.onCall(async (data, context) => {
    try {
        const token = await getAccessToken();
        const { filterDate } = data;
        const fromDate = filterDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const toDate = new Date().toISOString();
        console.log(`Syncing Flipkart orders from ${fromDate}...`);
        const fetchShipments = async (type, states) => {
            try {
                const response = await axios_1.default.post(`${FLIPKART_API_BASE}/v3/shipments/filter`, {
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
            }
            catch (err) {
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
            orders: allShipments.map((ship) => ({
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
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        const errorData = error.response?.data;
        console.error('Flipkart API Error (v3):', JSON.stringify(errorData || error.message));
        const errorMsg = errorData?.message || JSON.stringify(errorData) || error.message;
        throw new functions.https.HttpsError('failed-precondition', `Flipkart Sync Failed: ${errorMsg}`);
    }
});
function mapStatus(flipkartStatus) {
    switch (flipkartStatus) {
        case 'CANCELLED': return 'Cancellation';
        case 'RETURNED': return 'CustomerReturn';
        case 'COMPLETED': return 'Sale';
        default: return 'Sale';
    }
}
//# sourceMappingURL=flipkart.js.map