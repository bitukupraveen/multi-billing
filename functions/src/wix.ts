import * as functions from 'firebase-functions';
import axios from 'axios';

const WIX_API_BASE = 'https://www.wixapis.com';
const WIX_API_KEY = 'IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcImVmNmUxZDdhLTE1YzUtNGI5My04MmYzLTRiNTJiMmYzZDdjYlwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcIjA3YWY3NjY0LWI2YzQtNGVjYS04NmQ4LTdiZGNmNzFmZjFjNFwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI3MmY1NDQ5YS04ZDYxLTQxNDktOTM5Mi02MDQ3ZGI5ZTVjZWVcIn19IiwiaWF0IjoxNzY5MTkyNDU1fQ.fNfm1JXutMj7sW6yHBh87-gPMnp9Uy38qmUl-mPibSQFHY4CK2Usj8FcY-MVj6-xCgF-olE-Jx3qj7jtG0G5UrS-Xpfq2awvfRCKliYtfkrd3jJ6cyCLNCHwhSgq9mJwt8-Hj1yG9mmMDRwXM_SLfhrG-w3evq59_P14alV4lfr3vMlujV5hbARhDkm58jxT-NliXhXspzPioVd1Abq8THEpo73SxYDHmAQ3pzXc3nyD6DwCcW-DNZw481SQI-g-h4Y06b6zrmeRwrEkR7AusSMj32MI44HlR8fDxMkEN_Y5PLL3lQSqqHCeWAspCprG0lKbaYn6bwknxwQyYFM1oQ';
const WIX_SITE_ID = '72f5449a-8d61-4149-9392-6047db9e5cee';

const headers = {
    'Authorization': WIX_API_KEY,
    'wix-site-id': WIX_SITE_ID,
    'Content-Type': 'application/json'
};

export const syncWixProducts = functions.https.onCall(async (data, context) => {
    try {
        console.log('Syncing Wix Products...');
        const response = await axios.post(`${WIX_API_BASE}/stores/v3/products/query`, {
            query: {
                paging: { limit: 100 }
            }
        }, { headers });

        const products = response.data.products || [];
        return {
            success: true,
            products: products.map((p: any) => ({
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
    } catch (error: any) {
        console.error('Wix Products Sync Error:', error.response?.data || error.message);
        throw new functions.https.HttpsError('internal', `Wix Products Sync Failed: ${error.message}`);
    }
});

export const syncWixOrders = functions.https.onCall(async (data, context) => {
    try {
        console.log('Syncing Wix Orders...');
        const response = await axios.post(`${WIX_API_BASE}/ecom/v1/orders/search`, {
            query: {
                paging: { limit: 100 },
                sort: [{ fieldName: 'createdDate', order: 'DESC' }]
            }
        }, { headers });

        const orders = response.data.orders || [];
        return {
            success: true,
            orders: orders.map((o: any) => ({
                orderId: o.id,
                orderNumber: o.number,
                createdDate: o.createdDate,
                customer: `${o.billingInfo?.contactDetails?.firstName || ''} ${o.billingInfo?.contactDetails?.lastName || ''}`.trim(),
                totalPrice: o.priceSummary?.total?.amount || 0,
                status: o.status,
                paymentStatus: o.paymentStatus,
                items: o.lineItems?.map((item: any) => ({
                    name: item.productName,
                    quantity: item.quantity,
                    price: item.price?.amount || 0
                }))
            }))
        };
    } catch (error: any) {
        console.error('Wix Orders Sync Error:', error.response?.data || error.message);
        throw new functions.https.HttpsError('internal', `Wix Orders Sync Failed: ${error.message}`);
    }
});
