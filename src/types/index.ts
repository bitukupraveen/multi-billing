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
export interface MeeshoOrder {
    id?: string;
    channel: string;
    orderId: string;
    subOrderId: string;
    subOrderContribution: 'Delivered' | 'RTO' | 'Return';
    paymentStatus: {
        ordered?: string;
        shipped?: string;
        delivered?: string;
        returned?: string;
        rto?: string;
        paymentPaid?: string;
    };
    productDetails: {
        productName: string;
        skuCode: string;
        hsnCode: string;
        quantity: number;
        productCost: number;
        gstRate: number;
    };
    revenue: {
        saleRevenue: number;
        shippingRevenue: number;
        salesReturns: number;
        shippingReturns: number;
        forwardShippingRecovery: number;
        totalSaleAmount?: number;
    };
    deductions: {
        meeshoCommission: number;
        warehousingFee: number;
        shippingCharge: number;
        returnShippingCharge: number;
    };
    settlement: {
        tcsInputCredits: number;
        tdsDeduction: number;
    };
    summary: {
        bankSettlement: number;
        gst: number;
        profitLoss: number;
    };
    uploadDate: string;
}

export interface FlipkartGSTReportRecord {
    id?: string;
    sellerGstin?: string;
    orderId?: string;
    orderItemId?: string;
    productTitle?: string;
    fsn?: string;
    sku?: string;
    hsnCode?: string;
    eventType?: string;
    eventSubType?: string;
    orderType?: string;
    fulfilmentType?: string;
    orderDate?: string;
    orderApprovalDate?: string;
    itemQuantity?: number;
    shippedFromState?: string;
    warehouseId?: string;
    priceBeforeDiscount?: number;
    totalDiscount?: number;
    sellerShare?: number;
    bankOfferShare?: number;
    priceAfterDiscount?: number;
    shippingCharges?: number;
    finalInvoiceAmount?: number;
    taxType?: string;
    taxableValue?: number;
    cstRate?: number;
    cstAmount?: number;
    vatRate?: number;
    vatAmount?: number;
    luxuryCessRate?: number;
    luxuryCessAmount?: number;
    igstRate?: number;
    igstAmount?: number;
    cgstRate?: number;
    cgstAmount?: number;
    sgstRate?: number;
    sgstAmount?: number;
    tcsIgstRate?: number;
    tcsIgstAmount?: number;
    tcsCgstRate?: number;
    tcsCgstAmount?: number;
    tcsSgstRate?: number;
    tcsSgstAmount?: number;
    totalTcsDeducted?: number;
    buyerInvoiceId?: string;
    buyerInvoiceDate?: string;
    buyerInvoiceAmount?: number;
    billingPincode?: string;
    billingState?: string;
    deliveryPincode?: string;
    deliveryState?: string;
    usualPrice?: number;
    isShopsyOrder?: string;
    tdsRate?: number;
    tdsAmount?: number;
    irn?: string;
    businessName?: string;
    businessGstNumber?: string;
    beneficiaryName?: string;
    imei?: string;
    uploadDate: string;
    rawData?: Record<string, any>;
}

export interface FlipkartCashBackReportRecord {
    id?: string;
    sellerGstin?: string;
    orderId?: string;
    orderItemId?: string;
    documentType?: string;
    documentSubType?: string;
    noteId?: string; // Credit Note ID/ Debit Note ID
    invoiceAmount?: number;
    invoiceDate?: string;
    taxableValue?: number;
    luxuryCessRate?: number;
    luxuryCessAmount?: number;
    igstRate?: number;
    igstAmount?: number;
    cgstRate?: number;
    cgstAmount?: number;
    sgstRate?: number;
    sgstAmount?: number;
    tcsIgstRate?: number;
    tcsIgstAmount?: number;
    tcsCgstRate?: number;
    tcsCgstAmount?: number;
    tcsSgstRate?: number;
    tcsSgstAmount?: number;
    totalTcsDeducted?: number;
    deliveryState?: string;
    isShopsyOrder?: string;
    tdsRate?: number;
    tdsAmount?: number;
    irn?: string;
    businessName?: string;
    businessGstNumber?: string;
    uploadDate: string;
    rawData?: Record<string, any>;
}
