import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Upload, AlertCircle, Save, CheckCircle, Loader, Eye, Edit2, Trash2, Download, ChevronLeft, ChevronRight, Search, TrendingUp, DollarSign, Percent, RefreshCcw } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import type { FlipkartOrder, FlipkartGSTReportRecord } from '../types';
import FlipkartOrderModal from '../components/FlipkartOrderModal';

const FlipkartReport: React.FC = () => {
    const { data: savedOrders, add, update, remove, loading: firestoreLoading } = useFirestore<FlipkartOrder>('flipkartOrders');
    const { data: gstReports } = useFirestore<FlipkartGSTReportRecord>('flipkartGstReports');
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [duplicateCount, setDuplicateCount] = useState(0);
    const [skipDuplicates, setSkipDuplicates] = useState(true);
    const [newRecordsCount, setNewRecordsCount] = useState(0);

    // Pagination and Search state
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<FlipkartOrder | null>(null);
    const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setSaveSuccess(false);
        setDuplicateCount(0);
        setNewRecordsCount(0);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const bstr = event.target?.result;
                const workbook = XLSX.read(bstr, { type: 'binary' });
                const wsname = workbook.SheetNames[0];
                const ws = workbook.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);
                if (data.length === 0) throw new Error("No data found in the Excel file.");

                // Identify duplicates
                const existingItemIds = new Set(savedOrders.map(o => o.orderItemId));

                let dupes = 0;
                let news = 0;

                data.forEach((row: any) => {
                    const cleanRow = Object.fromEntries(
                        Object.entries(row).filter(([_, v]) => v !== undefined && v !== null)
                    );

                    const getVal = (keys: string[]) => {
                        const foundKey = Object.keys(cleanRow).find(k =>
                            keys.some(key => {
                                const normalizedKey = k.toLowerCase().replace(/[\s\(\)₹\.]/g, '');
                                const normalizedSearch = key.toLowerCase().replace(/[\s\(\)₹\.]/g, '');
                                return normalizedKey.includes(normalizedSearch);
                            })
                        );
                        return foundKey ? cleanRow[foundKey] : null;
                    };

                    const orderItemId = getVal(['Order item ID'])?.toString() || '';

                    if (existingItemIds.has(orderItemId)) {
                        dupes++;
                    } else {
                        news++;
                    }
                });

                setDuplicateCount(dupes);
                setNewRecordsCount(news);
                setParsedData(data);
            } catch (err) {
                console.error("Error reading file:", err);
                setError(err instanceof Error ? err.message : "Failed to parse the Excel file.");
                setParsedData([]);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleSaveToFirebase = async () => {
        if (parsedData.length === 0) return;

        setSaving(true);
        setError(null);

        try {
            const uploadDate = new Date().toISOString();

            const existingItemIds = new Set(savedOrders.map(o => o.orderItemId));

            for (const row of parsedData) {
                // ... (logic to extract order details)
                const cleanRow = Object.fromEntries(
                    Object.entries(row).filter(([_, v]) => v !== undefined && v !== null)
                );

                const getVal = (keys: string[]) => {
                    const foundKey = Object.keys(cleanRow).find(k =>
                        keys.some(key => {
                            const normalizedKey = k.toLowerCase().replace(/[\s\(\)₹\.]/g, '');
                            const normalizedSearch = key.toLowerCase().replace(/[\s\(\)₹\.]/g, '');
                            return normalizedKey.includes(normalizedSearch);
                        })
                    );
                    return foundKey ? cleanRow[foundKey] : null;
                };

                const orderId = getVal(['Order ID'])?.toString() || '';
                const orderItemId = getVal(['Order item ID'])?.toString() || '';

                // Skip duplicates if enabled
                if (skipDuplicates && existingItemIds.has(orderItemId)) {
                    continue;
                }

                const order: Omit<FlipkartOrder, 'id'> = {
                    // Payment Details
                    neftId: getVal(['NEFT ID'])?.toString() || '',
                    neftType: getVal(['Neft Type'])?.toString() || '',
                    paymentDate: getVal(['Payment Date'])?.toString() || '',
                    bankSettlementValue: Number(getVal(['Bank Settlement Value'])) || 0,
                    inputGstTcsCredits: Number(getVal(['Input GST + TCS Credits'])) || 0,
                    incomeTaxCredits: Number(getVal(['Income Tax Credits'])) || 0,

                    // Transaction Summary
                    orderId,
                    orderItemId,
                    saleAmount: Number(getVal(['Sale Amount', 'Order Item Value'])) || 0,
                    totalOfferAmountSum: Number(getVal(['Total Offer Amount (Rs.)', 'Total Offer Amount'])) || 0,
                    myShare: Number(getVal(['My share'])) || 0,
                    customerAddOnsAmount: Number(getVal(['Customer Add-ons Amount'])) || 0,
                    marketplaceFee: Number(getVal(['Marketplace Fee'])) || 0,
                    taxes: Number(getVal(['Taxes'])) || 0,
                    offerAdjustmentsSum: Number(getVal(['Offer Adjustments'])) || 0,
                    protectionFund: Number(getVal(['Protection Fund'])) || 0,
                    refund: Number(getVal(['Refund'])) || 0,

                    // Marketplace Fees
                    tier: getVal(['Tier'])?.toString() || '',
                    commissionRate: Number(getVal(['Commission Rate'])) || 0,
                    commission: Number(getVal(['Commission'])) || 0,
                    fixedFee: Number(getVal(['Fixed Fee'])) || 0,
                    collectionFee: Number(getVal(['Collection Fee'])) || 0,
                    pickAndPackFee: Number(getVal(['Pick And Pack Fee', 'Pick & Pack Fee'])) || 0,
                    shippingFee: Number(getVal(['Shipping Fee'])) || 0,
                    reverseShippingFee: Number(getVal(['Reverse Shipping Fee'])) || 0,
                    noCostEmiFeeReimbursement: Number(getVal(['No Cost Emi Fee Reimbursement'])) || 0,
                    installationFee: Number(getVal(['Installation Fee'])) || 0,
                    techVisitFee: Number(getVal(['Tech Visit Fee'])) || 0,
                    uninstallationPackagingFee: Number(getVal(['Uninstallation & Packaging Fee'])) || 0,
                    customerAddOnsAmountRecovery: Number(getVal(['Customer Add-ons Amount Recovery'])) || 0,
                    franchiseFee: Number(getVal(['Franchise Fee'])) || 0,
                    shopsyMarketingFee: Number(getVal(['Shopsy Marketing Fee'])) || 0,
                    productCancellationFee: Number(getVal(['Product Cancellation Fee'])) || 0,

                    // Taxes
                    tcs: Number(getVal(['TCS'])) || 0,
                    tds: Number(getVal(['TDS'])) || 0,
                    gstOnMpFees: Number(getVal(['GST on MP Fees'])) || 0,

                    // Offer Adjustments
                    offerAmountSettledAsDiscountInMpFee: Number(getVal(['Offer amount settled as Discount in MP Fee'])) || 0,
                    itemGstRate: Number(getVal(['Item GST Rate'])) || 0,
                    discountInMpFees: Number(getVal(['Discount in MP fees'])) || 0,
                    gstOnDiscount: Number(getVal(['GST on Discount'])) || 0,
                    totalDiscountInMpFee: Number(getVal(['Total Discount in MP Fee'])) || 0,
                    offerAdjustment: Number(getVal(['Offer Adjustment'])) || 0,

                    // Shipping Details
                    lengthBreadthHeight: getVal(['Length*Breadth*Height'])?.toString() || '',
                    volumetricWeight: Number(getVal(['Volumetric Weight'])) || 0,
                    chargeableWeightSource: getVal(['Chargeable Weight Source'])?.toString() || '',
                    chargeableWeightType: getVal(['Chargeable Weight Type'])?.toString() || '',
                    chargeableWtSlab: Number(getVal(['Chargeable Wt. Slab'])) || 0,
                    shippingZone: getVal(['Shipping Zone'])?.toString() || '',

                    // Order Details
                    orderDate: getVal(['Order Date'])?.toString() || '',
                    dispatchDate: getVal(['Dispatch Date'])?.toString() || '',
                    fulfilmentType: getVal(['Fulfilment Type'])?.toString() || '',
                    sellerSku: getVal(['Seller SKU', 'SKU'])?.toString() || '',
                    quantity: Number(getVal(['Quantity'])) || 0,
                    productSubCategory: getVal(['Product Sub Category'])?.toString() || '',
                    additionalInformation: getVal(['Additional Information'])?.toString() || '',
                    returnType: getVal(['Return Type'])?.toString() || '',
                    shopsyOrder: getVal(['Shopsy Order'])?.toString() || '',
                    itemReturnStatus: getVal(['Item Return Status'])?.toString() || '',

                    // Buyer Invoice Details
                    invoiceId: getVal(['Invoice ID', 'Buyer Invoice ID'])?.toString() || '',
                    invoiceDate: getVal(['Invoice Date', 'Buyer Invoice Date'])?.toString() || '',

                    // Buyer Sale Details
                    totalSaleAmount: Number(getVal(['Total Sale Amount'])) || 0,
                    totalOfferAmount: Number(getVal(['Total Offer Amount'])) || 0,
                    freeShippingOffer: Number(getVal(['Free Shipping Offer'])) || 0,
                    nonFreeShippingOffer: Number(getVal(['Non-Free Shipping Offer'])) || 0,

                    // My Share
                    totalMyShare: Number(getVal(['Total My Share'])) || 0,
                    myShareFreeShippingOffer: Number(getVal(['Free Shipping Offer'])) || 0,
                    myShareNonFreeShippingOffer: Number(getVal(['Non-Free Shipping Offer'])) || 0,

                    uploadDate,
                    rawData: cleanRow
                };

                await add(order);
            }

            setSaveSuccess(true);
            setParsedData([]);
        } catch (err: any) {
            console.error("Error saving to Firebase:", err);
            setError(`Failed to save data: ${err.message || 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleSyncStatus = async () => {
        if (!gstReports.length || !savedOrders.length) {
            setError("Need both GST Reports and Order data to sync status.");
            return;
        }

        setSaving(true);
        setError(null);
        let updatedCount = 0;

        try {
            // Create a map of orderId/orderItemId to GST event
            const gstMap = new Map();
            gstReports.forEach(g => {
                if (g.orderItemId) gstMap.set(g.orderItemId, g.eventType);
                else if (g.orderId) gstMap.set(g.orderId, g.eventType);
            });

            for (const order of savedOrders) {
                if (!order.id) continue;

                const gstEvent = gstMap.get(order.orderItemId) || gstMap.get(order.orderId);

                if (gstEvent) {
                    let newStatus = '';
                    const eventLower = gstEvent.toLowerCase();
                    if (eventLower.includes('sale')) newStatus = 'Delivered';
                    else if (eventLower.includes('return')) newStatus = 'Return';
                    else if (eventLower.includes('cancel')) newStatus = 'Cancelled';

                    if (newStatus && order.itemReturnStatus !== newStatus) {
                        await update(order.id, { ...order, itemReturnStatus: newStatus });
                        updatedCount++;
                    }
                }
            }
            setSaveSuccess(true);
            setError(null);
            setTimeout(() => setSaveSuccess(false), 3000);
            if (updatedCount > 0) {
                alert(`Sync completed! Updated ${updatedCount} records.`);
            } else {
                alert("Sync completed! All records are already up to date.");
            }
        } catch (err: any) {
            console.error("Sync Error:", err);
            setError(`Sync failed: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleView = (order: FlipkartOrder) => {
        setSelectedOrder(order);
        setModalMode('view');
        setModalOpen(true);
    };

    const handleEdit = (order: FlipkartOrder) => {
        setSelectedOrder(order);
        setModalMode('edit');
        setModalOpen(true);
    };

    const handleDelete = async (order: FlipkartOrder) => {
        if (!order.id) return;
        if (window.confirm(`Delete order ${order.orderId}?`)) {
            await remove(order.id);
        }
    };

    const handleSaveOrder = async (updatedOrder: FlipkartOrder) => {
        if (!updatedOrder.id) return;
        await update(updatedOrder.id, updatedOrder);
        setModalOpen(false);
        setSelectedOrder(null);
    };

    const handleToggleSelectAll = () => {
        if (selectedIds.size === paginatedOrders.length && paginatedOrders.length > 0) {
            setSelectedIds(new Set());
        } else {
            const newSelection = new Set(selectedIds);
            paginatedOrders.forEach(order => {
                if (order.id) newSelection.add(order.id);
            });
            setSelectedIds(newSelection);
        }
    };

    const handleToggleSelect = (id: string) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) newSelection.delete(id);
        else newSelection.add(id);
        setSelectedIds(newSelection);
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedIds.size} orders?`)) return;
        setSaving(true);
        try {
            for (const id of Array.from(selectedIds)) {
                await remove(id);
            }
            setSelectedIds(new Set());
        } catch (err) {
            console.error("Failed to delete records:", err);
            setError("Failed to delete some records.");
        } finally {
            setSaving(false);
        }
    };

    const handleExportExcel = () => {
        if (savedOrders.length === 0) return;
        const ws = XLSX.utils.json_to_sheet(savedOrders);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Flipkart Orders");
        XLSX.writeFile(wb, `Flipkart_Orders_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const filteredOrders = useMemo(() => {
        if (!searchTerm) return savedOrders;
        const lowSearch = searchTerm.toLowerCase();
        return savedOrders.filter(order =>
            (order.orderId || '').toLowerCase().includes(lowSearch) ||
            (order.orderItemId || '').toLowerCase().includes(lowSearch) ||
            (order.sellerSku || '').toLowerCase().includes(lowSearch)
        );
    }, [savedOrders, searchTerm]);

    const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const metrics = useMemo(() => {
        return filteredOrders.reduce((acc, order) => ({
            totalSale: acc.totalSale + (order.saleAmount || 0),
            totalSettlement: acc.totalSettlement + (order.bankSettlementValue || 0),
            totalFees: acc.totalFees + (order.marketplaceFee || 0),
            totalTaxes: acc.totalTaxes + (order.tcs || 0) + (order.tds || 0)
        }), { totalSale: 0, totalSettlement: 0, totalFees: 0, totalTaxes: 0 });
    }, [filteredOrders]);

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="h3 mb-0 fw-bold text-gray-800">Flipkart Order Report</h2>
                <div className="d-flex gap-2">
                    <button
                        className="btn btn-outline-primary d-flex align-items-center gap-2"
                        onClick={handleExportExcel}
                        disabled={savedOrders.length === 0}
                    >
                        <Download size={18} />
                        Export to Excel
                    </button>
                    <button
                        className="btn btn-outline-success d-flex align-items-center gap-2"
                        onClick={handleSyncStatus}
                        disabled={saving || savedOrders.length === 0 || gstReports.length === 0}
                    >
                        <RefreshCcw size={18} className={saving ? 'animate-spin' : ''} />
                        Sync Status
                    </button>
                    {selectedIds.size > 0 && (
                        <button
                            className="btn btn-danger d-flex align-items-center gap-2"
                            onClick={handleBulkDelete}
                        >
                            <Trash2 size={18} />
                            Delete Selected ({selectedIds.size})
                        </button>
                    )}
                </div>
            </div>

            {/* Analysis Stats Cards */}
            <div className="row g-4 mb-4">
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm bg-primary text-white overflow-hidden">
                        <div className="card-body p-4 position-relative">
                            <DollarSign className="position-absolute opacity-25" style={{ right: '20px', bottom: '20px' }} size={64} />
                            <h6 className="text-uppercase small fw-bold opacity-75 mb-3">Total Sales Amount</h6>
                            <h2 className="fw-bold mb-0">₹{metrics.totalSale.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm bg-success text-white overflow-hidden">
                        <div className="card-body p-4 position-relative">
                            <TrendingUp className="position-absolute opacity-25" style={{ right: '20px', bottom: '20px' }} size={64} />
                            <h6 className="text-uppercase small fw-bold opacity-75 mb-3">Total Settlement</h6>
                            <h2 className="fw-bold mb-0">₹{metrics.totalSettlement.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm bg-info text-white overflow-hidden">
                        <div className="card-body p-4 position-relative">
                            <Percent className="position-absolute opacity-25" style={{ right: '20px', bottom: '20px' }} size={64} />
                            <h6 className="text-uppercase small fw-bold opacity-75 mb-3">Marketplace Fees</h6>
                            <h2 className="fw-bold mb-0">₹{metrics.totalFees.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm bg-warning text-white overflow-hidden">
                        <div className="card-body p-4 position-relative">
                            <AlertCircle className="position-absolute opacity-25" style={{ right: '20px', bottom: '20px' }} size={64} />
                            <h6 className="text-uppercase small fw-bold opacity-75 mb-3">Total Taxes (TCS/TDS)</h6>
                            <h2 className="fw-bold mb-0">₹{metrics.totalTaxes.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h2>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Section */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                    <div className="row align-items-center">
                        <div className="col-md-6">
                            <label className="d-block mb-3 fw-medium text-secondary">Upload Order Report Excel</label>
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0">
                                    <Upload size={18} className="text-primary" />
                                </span>
                                <input
                                    type="file"
                                    className="form-control border-start-0"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileUpload}
                                />
                            </div>
                        </div>
                        {parsedData.length > 0 && (
                            <div className="col-md-6 mt-3 mt-md-0 d-flex flex-column gap-2">
                                <div className="d-flex align-items-center gap-3 mb-2 bg-light p-2 rounded">
                                    <div className="form-check form-switch mb-0">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="skipDuplicates"
                                            checked={skipDuplicates}
                                            onChange={(e) => setSkipDuplicates(e.target.checked)}
                                        />
                                        <label className="form-check-label small fw-medium" htmlFor="skipDuplicates">
                                            Skip Duplicates
                                        </label>
                                    </div>
                                    <div className="small text-secondary">
                                        <span className="text-success fw-bold">{newRecordsCount} New</span> |
                                        <span className="text-warning fw-bold ms-1">{duplicateCount} Duplicates</span>
                                    </div>
                                </div>
                                <div className="d-flex gap-2">
                                    <button
                                        className="btn btn-success flex-grow-1 d-flex align-items-center justify-content-center gap-2 py-2 shadow-sm"
                                        onClick={handleSaveToFirebase}
                                        disabled={saving || (skipDuplicates && newRecordsCount === 0)}
                                    >
                                        {saving ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
                                        Save {skipDuplicates ? newRecordsCount : parsedData.length} Records
                                    </button>
                                    <button
                                        className="btn btn-outline-secondary py-2"
                                        onClick={() => { setParsedData([]); setDuplicateCount(0); setNewRecordsCount(0); }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="alert alert-danger mt-3 d-flex align-items-center gap-2 border-0 shadow-sm">
                            <AlertCircle size={18} /> {error}
                        </div>
                    )}

                    {saveSuccess && (
                        <div className="alert alert-success mt-3 d-flex align-items-center gap-2 border-0 shadow-sm">
                            <CheckCircle size={18} /> Orders saved successfully!
                        </div>
                    )}
                </div>
            </div>

            {/* Table Section */}
            <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3 border-0">
                    <div className="row align-items-center">
                        <div className="col">
                            <h5 className="mb-0 fw-bold">Saved Order Records</h5>
                        </div>
                        <div className="col-md-4">
                            <div className="input-group input-group-sm">
                                <span className="input-group-text bg-white border-end-0">
                                    <Search size={16} className="text-secondary" />
                                </span>
                                <input
                                    type="text"
                                    className="form-control border-start-0 ps-0 shadow-none"
                                    placeholder="Search Order ID, Name..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="bg-light text-secondary small text-uppercase fw-bold">
                            <tr>
                                <th style={{ width: '40px' }} className="ps-4">
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        onChange={handleToggleSelectAll}
                                        checked={paginatedOrders.length > 0 && paginatedOrders.every(o => o.id && selectedIds.has(o.id))}
                                    />
                                </th>
                                <th>Order Info</th>
                                <th>Product Details</th>
                                <th className="text-end">Sale Amt</th>
                                <th className="text-end">Settlement</th>
                                <th className="text-end">Fees</th>
                                <th className="text-center pe-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="border-top-0">
                            {firestoreLoading ? (
                                <tr><td colSpan={7} className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></td></tr>
                            ) : paginatedOrders.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-5 text-secondary">No orders found</td></tr>
                            ) : (
                                paginatedOrders.map((order) => (
                                    <tr key={order.id} className={order.id && selectedIds.has(order.id) ? 'bg-primary bg-opacity-10' : ''}>
                                        <td className="ps-4">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={order.id ? selectedIds.has(order.id) : false}
                                                onChange={() => order.id && handleToggleSelect(order.id)}
                                            />
                                        </td>
                                        <td>
                                            <div className="fw-bold">{order.orderId}</div>
                                            <div className="small text-secondary">Date: {order.orderDate || order.paymentDate}</div>
                                        </td>
                                        <td>
                                            <div className="small fw-medium text-truncate" style={{ maxWidth: '200px' }}>{order.sellerSku}</div>
                                            <div className="small text-secondary">Qty: {order.quantity}</div>
                                        </td>
                                        <td className="text-end small">₹{order.saleAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td className="text-end small fw-bold text-success">₹{order.bankSettlementValue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td className="text-end small text-danger">₹{order.marketplaceFee?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td className="text-center pe-4">
                                            <div className="d-flex justify-content-center gap-1">
                                                <button className="btn btn-sm btn-icon btn-light" onClick={() => handleView(order)}><Eye size={16} className="text-primary" /></button>
                                                <button className="btn btn-sm btn-icon btn-light" onClick={() => handleEdit(order)}><Edit2 size={16} className="text-success" /></button>
                                                <button className="btn btn-sm btn-icon btn-light" onClick={() => handleDelete(order)}><Trash2 size={16} className="text-danger" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredOrders.length > ITEMS_PER_PAGE && (
                    <div className="card-footer bg-white border-0 py-3 d-flex justify-content-between align-items-center border-top">
                        <div className="text-secondary small">
                            Showing <span className="fw-bold">{startIndex + 1}</span> to <span className="fw-bold">{Math.min(startIndex + ITEMS_PER_PAGE, filteredOrders.length)}</span> of <span className="fw-bold">{filteredOrders.length}</span> records
                        </div>
                        <nav>
                            <ul className="pagination pagination-sm mb-0 gap-1">
                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                    <button
                                        className="page-link rounded border-0"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                </li>

                                {[...Array(totalPages)].map((_, i) => {
                                    const pageNum = i + 1;
                                    if (
                                        pageNum === 1 ||
                                        pageNum === totalPages ||
                                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                    ) {
                                        return (
                                            <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                                                <button
                                                    className={`page-link rounded border-0 ${currentPage === pageNum ? 'bg-primary text-white' : ''}`}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                >
                                                    {pageNum}
                                                </button>
                                            </li>
                                        );
                                    } else if (
                                        pageNum === currentPage - 2 ||
                                        pageNum === currentPage + 2
                                    ) {
                                        return <li key={pageNum} className="page-item disabled"><span className="page-link border-0">...</span></li>;
                                    }
                                    return null;
                                })}

                                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                    <button
                                        className="page-link rounded border-0"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                )}
            </div>

            <FlipkartOrderModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setSelectedOrder(null); }}
                order={selectedOrder}
                onSave={handleSaveOrder}
                mode={modalMode}
            />
        </div>
    );
};

export default FlipkartReport;
