import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Upload, AlertCircle, Save, CheckCircle, Loader, Eye, Edit2, Trash2, Download, ChevronLeft, ChevronRight, Search, TrendingUp, DollarSign, Percent } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import type { MeeshoOrder } from '../types';
import MeeshoOrderModal from '../components/MeeshoOrderModal';

const MeeshoReport: React.FC = () => {
    const { data: savedOrders, add, update, remove, loading: firestoreLoading } = useFirestore<MeeshoOrder>('meeshoOrders');
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
    const [selectedOrder, setSelectedOrder] = useState<MeeshoOrder | null>(null);
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
                const existingSubOrders = new Set(savedOrders.map(o => o.subOrderNo));

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

                    const subOrderNo = getVal(['Sub Order No', 'SubOrderNo'])?.toString() || '';

                    if (subOrderNo && existingSubOrders.has(subOrderNo)) {
                        dupes++;
                    } else if (subOrderNo) {
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
            const existingSubOrders = new Set(savedOrders.map(o => o.subOrderNo));

            for (const row of parsedData) {
                const cleanRow = Object.fromEntries(
                    Object.entries(row).filter(([_, v]) => v !== undefined && v !== null)
                );

                const getVal = (keys: string[]) => {
                    const foundKey = Object.keys(cleanRow).find(k =>
                        keys.some(key => {
                            const normalizedKey = k.toLowerCase().replace(/[\s\(\)₹\%\.]/g, '');
                            const normalizedSearch = key.toLowerCase().replace(/[\s\(\)₹\%\.]/g, '');
                            return normalizedKey.includes(normalizedSearch);
                        })
                    );
                    return foundKey ? cleanRow[foundKey] : null;
                };

                const subOrderNo = getVal(['Sub Order No'])?.toString() || '';

                if (!subOrderNo) continue; // Skip invalid rows
                if (skipDuplicates && existingSubOrders.has(subOrderNo)) continue;

                const order: Omit<MeeshoOrder, 'id'> = {
                    subOrderNo,
                    orderDate: getVal(['Order Date'])?.toString() || '',
                    dispatchDate: getVal(['Dispatch Date'])?.toString() || '',
                    productName: getVal(['Product Name'])?.toString() || '',
                    supplierSku: getVal(['Supplier SKU'])?.toString() || '',
                    catalogId: getVal(['Catalog ID'])?.toString() || '',
                    orderSource: getVal(['Order Source'])?.toString() || '',
                    liveOrderStatus: getVal(['Live Order Status'])?.toString() || '',
                    productGstPercentage: Number(getVal(['Product GST', 'Product GST %'])) || 0,
                    listingPrice: Number(getVal(['Listing Price'])) || 0,
                    quantity: Number(getVal(['Quantity'])) || 0,

                    transactionId: getVal(['Transaction ID'])?.toString() || '',
                    paymentDate: getVal(['Payment Date'])?.toString() || '',
                    finalSettlementAmount: Number(getVal(['Final Settlement Amount'])) || 0,

                    priceType: getVal(['Price Type'])?.toString() || '',
                    totalSaleAmount: Number(getVal(['Total Sale Amount'])) || 0,
                    totalSaleReturnAmount: Number(getVal(['Total Sale Return Amount'])) || 0,
                    fixedFeeRevenue: Number(getVal(['Fixed Fee'])) || 0,
                    warehousingFeeRevenue: Number(getVal(['Warehousing fee'])) || 0,
                    returnPremium: Number(getVal(['Return premium'])) || 0,
                    returnPremiumOfReturn: Number(getVal(['Return premium of Return', 'Return premium incl GST of Return'])) || 0,

                    meeshoCommissionPercentage: Number(getVal(['Meesho Commission Percentage'])) || 0,
                    meeshoCommission: Number(getVal(['Meesho Commission'])) || 0,
                    meeshoGoldPlatformFee: Number(getVal(['Meesho gold platform fee'])) || 0,
                    meeshoMallPlatformFee: Number(getVal(['Meesho mall platform fee'])) || 0,
                    fixedFeeDeduction: Number(getVal(['Fixed Fee (Incl. GST)', 'Fixed Fee Deduction'])) || 0,
                    warehousingFeeDeduction: Number(getVal(['Warehousing fee (Incl. GST)', 'Warehousing fee Deduction'])) || 0,
                    returnShippingCharge: Number(getVal(['Return Shipping Charge'])) || 0,
                    gstCompensationPRP: Number(getVal(['GST Compensation'])) || 0,
                    shippingCharge: Number(getVal(['Shipping Charge'])) || 0,

                    otherSupportServiceCharges: Number(getVal(['Other Support Service Charges'])) || 0,
                    waivers: Number(getVal(['Waivers'])) || 0,
                    netOtherSupportServiceCharges: Number(getVal(['Net Other Support Service Charges'])) || 0,
                    gstOnNetOtherSupportServiceCharges: Number(getVal(['GST on Net Other Support Service Charges'])) || 0,

                    tcs: Number(getVal(['TCS'])) || 0,
                    tdsRatePercentage: Number(getVal(['TDS Rate'])) || 0,
                    tds: Number(getVal(['TDS'])) || 0,

                    compensation: Number(getVal(['Compensation'])) || 0,
                    claims: Number(getVal(['Claims'])) || 0,
                    recovery: Number(getVal(['Recovery'])) || 0,
                    compensationReason: getVal(['Compensation Reason'])?.toString() || '',
                    claimsReason: getVal(['Claims Reason'])?.toString() || '',
                    recoveryReason: getVal(['Recovery Reason'])?.toString() || '',

                    uploadDate,
                    rawData: cleanRow
                };

                await add(order as any);
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

    const handleAdd = () => {
        setSelectedOrder({
            subOrderNo: '',
            uploadDate: new Date().toISOString()
        } as MeeshoOrder);
        setModalMode('edit');
        setModalOpen(true);
    };

    const handleView = (order: MeeshoOrder) => {
        setSelectedOrder(order);
        setModalMode('view');
        setModalOpen(true);
    };

    const handleEdit = (order: MeeshoOrder) => {
        setSelectedOrder(order);
        setModalMode('edit');
        setModalOpen(true);
    };

    const handleDelete = async (order: MeeshoOrder) => {
        if (!order.id) return;
        if (window.confirm(`Are you sure you want to delete order ${order.subOrderNo}?`)) {
            await remove(order.id);
        }
    };

    const handleDeleteAll = async () => {
        if (!window.confirm("ARE YOU SURE? This will delete ALL Meesho orders. This action cannot be undone.")) return;

        setSaving(true);
        try {
            const allIds = savedOrders.map(o => o.id).filter(id => id !== undefined);
            for (const id of allIds) {
                if (id) await remove(id);
            }
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: any) {
            console.error("Delete All Error:", err);
            setError("Failed to delete all records.");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveOrder = async (orderData: MeeshoOrder) => {
        try {
            if (orderData.id) {
                await update(orderData.id, orderData);
            } else {
                await add(orderData);
            }
            setModalOpen(false);
            setSelectedOrder(null);
        } catch (err) {
            console.error("Error saving order:", err);
            setError("Failed to save order.");
        }
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
        if (selectedIds.size === 0) return;
        if (!window.confirm(`Delete ${selectedIds.size} selected orders?`)) return;

        setSaving(true);
        try {
            for (const id of Array.from(selectedIds)) {
                await remove(id);
            }
            setSelectedIds(new Set());
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: any) {
            console.error("Bulk Delete Error:", err);
            setError("Failed to delete selected records.");
        } finally {
            setSaving(false);
        }
    };

    const handleExportExcel = () => {
        if (savedOrders.length === 0) return;

        // Flatten the data for better export
        const exportData = savedOrders.map(order => ({
            ...order,
            rawData: undefined // Exclude rawData from export
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Meesho Orders");
        XLSX.writeFile(wb, `Meesho_Orders_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const filteredOrders = useMemo(() => {
        if (!searchTerm) return savedOrders;
        const lowSearch = searchTerm.toLowerCase();
        return savedOrders.filter(order =>
            (order.subOrderNo || '').toLowerCase().includes(lowSearch) ||
            (order.supplierSku || '').toLowerCase().includes(lowSearch) ||
            (order.productName || '').toLowerCase().includes(lowSearch)
        );
    }, [savedOrders, searchTerm]);

    const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const metrics = useMemo(() => {
        return filteredOrders.reduce((acc, order) => ({
            totalSale: acc.totalSale + (order.totalSaleAmount || 0),
            totalSettlement: acc.totalSettlement + (order.finalSettlementAmount || 0),
            totalCommission: acc.totalCommission + (order.meeshoCommission || 0),
            totalDeductions: acc.totalDeductions +
                (order.fixedFeeDeduction || 0) +
                (order.warehousingFeeDeduction || 0) +
                (order.returnShippingCharge || 0) +
                (order.shippingCharge || 0),
            totalTaxes: acc.totalTaxes + (order.tcs || 0) + (order.tds || 0)
        }), { totalSale: 0, totalSettlement: 0, totalCommission: 0, totalDeductions: 0, totalTaxes: 0 });
    }, [filteredOrders]);

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="h3 mb-0 fw-bold text-gray-800">Meesho Order Report</h2>
                <div className="d-flex gap-2">
                    <button
                        className="btn btn-outline-danger d-flex align-items-center gap-2"
                        onClick={handleDeleteAll}
                        disabled={savedOrders.length === 0 || saving}
                    >
                        <Trash2 size={18} />
                        Delete All
                    </button>
                    <button
                        className="btn btn-warning d-flex align-items-center gap-2"
                        onClick={handleAdd}
                    >
                        {/* Note: Plus icon not imported, implementing as text or verify import. Importing Plus above. */}
                        Add New Order
                    </button>
                    <button
                        className="btn btn-outline-primary d-flex align-items-center gap-2"
                        onClick={handleExportExcel}
                        disabled={savedOrders.length === 0}
                    >
                        <Download size={18} />
                        Export to Excel
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
                <div className="col-md-6 col-lg-3">
                    <div className="card border-0 shadow-sm bg-primary text-white overflow-hidden h-100">
                        <div className="card-body p-3 position-relative">
                            <TrendingUp className="position-absolute opacity-25" style={{ right: '10px', bottom: '10px' }} size={48} />
                            <h6 className="text-uppercase small fw-bold opacity-75 mb-2">Total Sales</h6>
                            <h4 className="fw-bold mb-0">₹{metrics.totalSale.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h4>
                        </div>
                    </div>
                </div>
                <div className="col-md-6 col-lg-3">
                    <div className="card border-0 shadow-sm bg-success text-white overflow-hidden h-100">
                        <div className="card-body p-3 position-relative">
                            <DollarSign className="position-absolute opacity-25" style={{ right: '10px', bottom: '10px' }} size={48} />
                            <h6 className="text-uppercase small fw-bold opacity-75 mb-2">Total Settlement</h6>
                            <h4 className="fw-bold mb-0">₹{metrics.totalSettlement.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h4>
                            <div className="small opacity-75 mt-1">{(metrics.totalSale ? (metrics.totalSettlement / metrics.totalSale * 100).toFixed(1) : 0)}% Realization</div>
                        </div>
                    </div>
                </div>
                <div className="col-md-6 col-lg-3">
                    <div className="card border-0 shadow-sm bg-info text-white overflow-hidden h-100">
                        <div className="card-body p-3 position-relative">
                            <Percent className="position-absolute opacity-25" style={{ right: '10px', bottom: '10px' }} size={48} />
                            <h6 className="text-uppercase small fw-bold opacity-75 mb-2">Total Commission</h6>
                            <h4 className="fw-bold mb-0">₹{metrics.totalCommission.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h4>
                        </div>
                    </div>
                </div>
                <div className="col-md-6 col-lg-3">
                    <div className="card border-0 shadow-sm bg-danger text-white overflow-hidden h-100">
                        <div className="card-body p-3 position-relative">
                            <AlertCircle className="position-absolute opacity-25" style={{ right: '10px', bottom: '10px' }} size={48} />
                            <h6 className="text-uppercase small fw-bold opacity-75 mb-2">Total Deductions</h6>
                            <h4 className="fw-bold mb-0">₹{metrics.totalDeductions.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h4>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Section */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                    <div className="row align-items-center">
                        <div className="col-md-6">
                            <label className="d-block mb-3 fw-medium text-secondary">Upload Meesho Order Report Excel</label>
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

            {/* Data Table */}
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
                                    placeholder="Search Sub Order, SKU, Product..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 text-nowrap">
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
                                <th className="text-center">Status</th>
                                <th className="text-end">Sale Amt</th>
                                <th className="text-end">Settlement</th>
                                <th className="text-end">Commission</th>
                                <th className="text-end">TCS/TDS</th>
                                <th className="text-center pe-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="border-top-0">
                            {firestoreLoading ? (
                                <tr><td colSpan={9} className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></td></tr>
                            ) : paginatedOrders.length === 0 ? (
                                <tr><td colSpan={9} className="text-center py-5 text-secondary">No orders found</td></tr>
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
                                            <div className="fw-bold">{order.subOrderNo}</div>
                                            <div className="small text-secondary">Date: {order.orderDate}</div>
                                        </td>
                                        <td>
                                            <div className="fw-medium text-truncate" style={{ maxWidth: '180px' }} title={order.productName || ''}>{order.productName || '-'}</div>
                                            <div className="small text-secondary">SKU: {order.supplierSku} | Qty: {order.quantity}</div>
                                        </td>
                                        <td className="text-center">
                                            <span className={`badge ${order.liveOrderStatus?.toLowerCase().includes('delivered') ? 'bg-success-subtle text-success' :
                                                    order.liveOrderStatus?.toLowerCase().includes('cancel') ? 'bg-danger-subtle text-danger' :
                                                        order.liveOrderStatus?.toLowerCase().includes('return') ? 'bg-warning-subtle text-warning' :
                                                            'bg-light text-dark border'
                                                }`}>
                                                {order.liveOrderStatus || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="text-end small">₹{order.totalSaleAmount?.toFixed(2)}</td>
                                        <td className="text-end small fw-bold text-success">₹{order.finalSettlementAmount?.toFixed(2)}</td>
                                        <td className="text-end small text-danger">₹{order.meeshoCommission?.toFixed(2)}</td>
                                        <td className="text-end small">₹{((order.tcs || 0) + (order.tds || 0)).toFixed(2)}</td>
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

            {/* Modal */}
            {modalOpen && (
                <MeeshoOrderModal
                    isOpen={modalOpen}
                    onClose={() => {
                        setModalOpen(false);
                        setSelectedOrder(null);
                    }}
                    order={selectedOrder}
                    onSave={handleSaveOrder}
                    mode={modalMode}
                />
            )}
        </div>
    );
};

export default MeeshoReport;
