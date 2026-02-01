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
    // Payment Details
    neftId?: string;
    neftType?: string;
    paymentDate?: string;
    bankSettlementValue?: number;
    inputGstTcsCredits?: number;
    incomeTaxCredits?: number;

    // Transaction Summary
    orderId?: string;
    orderItemId?: string;
    saleAmount?: number;
    totalOfferAmountSum?: number; // Sum in Transaction Summary
    myShare?: number;
    customerAddOnsAmount?: number;
    marketplaceFee?: number;
    taxes?: number;
    offerAdjustmentsSum?: number; // Sum in Transaction Summary
    protectionFund?: number;
    refund?: number;

    // Marketplace Fees
    tier?: string;
    commissionRate?: number;
    commission?: number;
    fixedFee?: number;
    collectionFee?: number;
    pickAndPackFee?: number;
    shippingFee?: number;
    reverseShippingFee?: number;
    noCostEmiFeeReimbursement?: number;
    installationFee?: number;
    techVisitFee?: number;
    uninstallationPackagingFee?: number;
    customerAddOnsAmountRecovery?: number;
    franchiseFee?: number;
    shopsyMarketingFee?: number;
    productCancellationFee?: number;

    // Taxes
    tcs?: number;
    tds?: number;
    gstOnMpFees?: number;

    // Offer Adjustments
    offerAmountSettledAsDiscountInMpFee?: number;
    itemGstRate?: number;
    discountInMpFees?: number;
    gstOnDiscount?: number;
    totalDiscountInMpFee?: number;
    offerAdjustment?: number;

    // Shipping Details
    lengthBreadthHeight?: string;
    volumetricWeight?: number;
    chargeableWeightSource?: string;
    chargeableWeightType?: string;
    chargeableWtSlab?: number;
    shippingZone?: string;

    // Order Details
    orderDate?: string;
    dispatchDate?: string;
    fulfilmentType?: string;
    sellerSku?: string;
    quantity?: number;
    productSubCategory?: string;
    additionalInformation?: string;
    returnType?: string;
    shopsyOrder?: string;
    itemReturnStatus?: string;

    // Buyer Invoice Details
    invoiceId?: string;
    invoiceDate?: string;

    // Buyer Sale Details
    totalSaleAmount?: number;
    totalOfferAmount?: number;
    freeShippingOffer?: number;
    nonFreeShippingOffer?: number;

    // My Share
    totalMyShare?: number;
    myShareFreeShippingOffer?: number;
    myShareNonFreeShippingOffer?: number;

    uploadDate: string;
    profitLoss?: number;
    rawData?: Record<string, any>;
}
export interface MeeshoOrder {
    id?: string;
    // Order Related Details
    subOrderNo: string;
    orderDate?: string;
    dispatchDate?: string;
    productName?: string;
    supplierSku?: string;
    catalogId?: string;
    orderSource?: string;
    liveOrderStatus?: string;
    productGstPercentage?: number;
    listingPrice?: number;
    quantity?: number;

    // Payment Details
    transactionId?: string;
    paymentDate?: string;
    finalSettlementAmount?: number;

    // Revenue Details
    priceType?: string;
    totalSaleAmount?: number;
    totalSaleReturnAmount?: number;
    fixedFeeRevenue?: number;
    warehousingFeeRevenue?: number;
    returnPremium?: number;
    returnPremiumOfReturn?: number;

    // Deductions
    meeshoCommissionPercentage?: number;
    meeshoCommission?: number;
    meeshoGoldPlatformFee?: number;
    meeshoMallPlatformFee?: number;
    fixedFeeDeduction?: number;
    warehousingFeeDeduction?: number;
    returnShippingCharge?: number;
    gstCompensationPRP?: number;
    shippingCharge?: number;

    // Other Charges
    otherSupportServiceCharges?: number;
    waivers?: number;
    netOtherSupportServiceCharges?: number;
    gstOnNetOtherSupportServiceCharges?: number;

    // TCS & TDS
    tcs?: number;
    tdsRatePercentage?: number;
    tds?: number;

    // Compensation Details
    compensation?: number;
    claims?: number;
    recovery?: number;
    compensationReason?: string;
    claimsReason?: string;
    recoveryReason?: string;

    uploadDate: string;
    profitLoss?: number;
    rawData?: Record<string, any>;
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

export interface MeeshoSalesRepoRecord {
    id?: string;
    identifier?: string;
    supName?: string;
    gstin?: string;
    subOrderNum?: string;
    orderDate?: string;
    hsnCode?: string;
    quantity?: number;
    gstRate?: number;
    totalTaxableSaleValue?: number;
    taxAmount?: number;
    totalInvoiceValue?: number;
    taxableShipping?: number;
    endCustomerStateNew?: string;
    enrollmentNo?: string;
    financialYear?: string;
    monthNumber?: number;
    supplierId?: string;
    uploadDate: string;
    rawData?: Record<string, any>;
}

export interface MeeshoSalesReturnRecord {
    id?: string;
    identifier?: string;
    supName?: string;
    gstin?: string;
    subOrderNum?: string;
    orderDate?: string;
    cancelReturnDate?: string;
    hsnCode?: string;
    quantity?: number;
    gstRate?: number;
    totalTaxableSaleValue?: number;
    taxAmount?: number;
    totalInvoiceValue?: number;
    taxableShipping?: number;
    endCustomerStateNew?: string;
    enrollmentNo?: string;
    financialYear?: string;
    monthNumber?: number;
    supplierId?: string;
    uploadDate: string;
    rawData?: Record<string, any>;
}
