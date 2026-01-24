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
exports.syncWixOrders = exports.syncWixProducts = void 0;
const functions = __importStar(require("firebase-functions"));
const axios_1 = __importDefault(require("axios"));
const WIX_API_BASE = 'https://www.wixapis.com';
const WIX_API_KEY = 'IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcImVmNmUxZDdhLTE1YzUtNGI5My04MmYzLTRiNTJiMmYzZDdjYlwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcIjA3YWY3NjY0LWI2YzQtNGVjYS04NmQ4LTdiZGNmNzFmZjFjNFwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI3MmY1NDQ5YS04ZDYxLTQxNDktOTM5Mi02MDQ3ZGI5ZTVjZWVcIn19IiwiaWF0IjoxNzY5MTkyNDU1fQ.fNfm1JXutMj7sW6yHBh87-gPMnp9Uy38qmUl-mPibSQFHY4CK2Usj8FcY-MVj6-xCgF-olE-Jx3qj7jtG0G5UrS-Xpfq2awvfRCKliYtfkrd3jJ6cyCLNCHwhSgq9mJwt8-Hj1yG9mmMDRwXM_SLfhrG-w3evq59_P14alV4lfr3vMlujV5hbARhDkm58jxT-NliXhXspzPioVd1Abq8THEpo73SxYDHmAQ3pzXc3nyD6DwCcW-DNZw481SQI-g-h4Y06b6zrmeRwrEkR7AusSMj32MI44HlR8fDxMkEN_Y5PLL3lQSqqHCeWAspCprG0lKbaYn6bwknxwQyYFM1oQ';
const WIX_SITE_ID = '72f5449a-8d61-4149-9392-6047db9e5cee';
const headers = {
    'Authorization': WIX_API_KEY,
    'wix-site-id': WIX_SITE_ID,
    'Content-Type': 'application/json'
};
exports.syncWixProducts = functions.https.onCall(async (data, context) => {
    try {
        console.log('Syncing Wix Products...');
        const response = await axios_1.default.post(`${WIX_API_BASE}/stores/v3/products/query`, {
            query: {
                paging: { limit: 100 }
            }
        }, { headers });
        const products = response.data.products || [];
        return {
            success: true,
            products: products.map((p) => ({
                id: p.id,
                name: p.name,
                sku: p.sku || 'N/A',
                price: p.priceData?.price || 0,
                discountedPrice: p.priceData?.discountedPrice || 0,
                currency: p.priceData?.currency || 'INR',
                inventory: p.stock?.trackInventory ? p.stock?.quantity : 'Unlimited',
                description: p.description,
                media: p.media?.items?.[0]?.image?.url || ''
            }))
        };
    }
    catch (error) {
        console.error('Wix Products Sync Error:', error.response?.data || error.message);
        throw new functions.https.HttpsError('internal', `Wix Products Sync Failed: ${error.message}`);
    }
});
exports.syncWixOrders = functions.https.onCall(async (data, context) => {
    try {
        console.log('Syncing Wix Orders...');
        const response = await axios_1.default.post(`${WIX_API_BASE}/ecom/v1/orders/search`, {
            query: {
                paging: { limit: 100 },
                sort: [{ fieldName: 'createdDate', order: 'DESC' }]
            }
        }, { headers });
        const orders = response.data.orders || [];
        return {
            success: true,
            orders: orders.map((o) => ({
                orderId: o.id,
                orderNumber: o.number,
                createdDate: o.createdDate,
                customer: `${o.billingInfo?.contactDetails?.firstName || ''} ${o.billingInfo?.contactDetails?.lastName || ''}`.trim(),
                totalPrice: o.priceSummary?.total?.amount || 0,
                status: o.status,
                paymentStatus: o.paymentStatus,
                items: o.lineItems?.map((item) => ({
                    name: item.productName,
                    quantity: item.quantity,
                    price: item.price?.amount || 0
                }))
            }))
        };
    }
    catch (error) {
        console.error('Wix Orders Sync Error:', error.response?.data || error.message);
        throw new functions.https.HttpsError('internal', `Wix Orders Sync Failed: ${error.message}`);
    }
});
//# sourceMappingURL=wix.js.map