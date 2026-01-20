export interface Product {
    id: string;
    sku: string;
    title: string;
    category: string;
    mrp: number;
    purchasePrice: number;
    salePrice: number;
    image: string; // URL or Base64
    quantity: number;
    hsnCode?: string;
    gstRate: number; // 0, 5, 12, 18, 28
    status?: 'active' | 'inactive';
}

export interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
}

// CartItem allows string for editable fields to support typing decimals (e.g. "10.")
export interface CartItem extends Omit<Product, 'mrp' | 'salePrice' | 'purchasePrice' | 'gstRate'> {
    mrp: number | string;
    salePrice: number | string;
    purchasePrice: number | string;
    gstRate: number | string;
    quantity: number;
    discount: number | string; // Percentage
    // Inherited from Product but need explicit re-declaration if omitted? 
    // Omit removes them, so we just add them back with union type.
    // We need to ensure other Product props are still there.
    id: string;
    sku: string;
    title: string;
    category: string;
    image: string;
    hsnCode?: string;
}

export interface InvoiceItem {
    productId: string;
    productName: string;
    quantity: number;
    mrp: number;      // Snapshot
    price: number;    // Unit Price (Snapshot)
    discount: number; // Percentage (Snapshot)
    tax: number;      // Tax Rate (Snapshot)
    total: number;
}

export type ChannelType = 'OFFLINE' | 'AMAZON' | 'FLIPKART' | 'MEESHO' | 'WEBSITE';
export type InvoiceType = 'SALES' | 'RETURN' | 'PURCHASE';

export interface Invoice {
    id: string;
    date: string;
    customerId: string;
    customerName: string;
    customerPhone?: string;
    items: InvoiceItem[];
    subTotal: number;
    tax: number;
    logisticsFee?: number;
    marketplaceFee?: number;
    otherTax?: number;
    refundAmount?: number;
    totalAmount: number;

    // Phase 1 Updates
    channel?: ChannelType;
    channelOrderId?: string;
    invoiceType?: InvoiceType;
    pdfPath?: string;
}

export interface PurchaseBill extends Invoice {
    vendorName: string; // instead of customerName
    deliveryCharges: number;
}

export interface FlipkartOrder {
    id?: string;
    channel?: string;
    orderId?: string;
    orderItemId?: string;
    dispatchedDate?: string;
    paymentDate?: string;
    sku?: string;
    quantity?: number;
    paymentMode?: 'Prepaid' | 'Postpaid';
    hsnCode?: string;
    fromState?: string;
    toState?: string;
    orderItemValue?: number;
    customerLogisticsFee?: number;
    sellerPrice?: number;
    marketplaceFees?: number;
    gstOnFees?: number;
    productCost?: number;
    bankSettlement?: number;
    inputGstCredit?: number;
    tdsCredit?: number;
    deliveryStatus?: 'Sale' | 'CustomerReturn' | 'LogisticsReturn' | 'Cancellation';
    returnProductStatus?: 'Working' | 'Damaged';
    refundAmount?: number;
    totalDiscount?: number;
    profitLoss?: number;
    uploadDate: string;
    // Store all raw data from Excel for flexibility
    rawData?: Record<string, any>;
}
