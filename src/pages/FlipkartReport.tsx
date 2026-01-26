import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, AlertCircle, Save, CheckCircle, Loader, Eye, Edit2, Trash2, Download, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import type { FlipkartOrder } from '../types';
import FlipkartOrderModal from '../components/FlipkartOrderModal';

const FlipkartReport: React.FC = () => {
    const { data: savedOrders, add, update, remove, loading: firestoreLoading } = useFirestore<FlipkartOrder>('flipkartOrders');
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

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

        setFileName(file.name);
        setError(null);
        setSaveSuccess(false);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const bstr = event.target?.result;
                const workbook = XLSX.read(bstr, { type: 'binary' });
                const wsname = workbook.SheetNames[0];
                const ws = workbook.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);
                setParsedData(data);
            } catch (err) {
                console.error("Error reading file:", err);
                setError("Failed to parse the Excel file. Please ensure it is a valid format.");
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

            for (const row of parsedData) {
                const getVal = (keys: string[]) => {
                    const foundKey = Object.keys(row).find(k =>
                        keys.some(key => k.toLowerCase().includes(key.toLowerCase()))
                    );
                    return foundKey ? row[foundKey] : null;
                };

                const sellerPrice = Number(getVal(['Seller Price', 'Price'])) || 0;
                const marketplaceFees = Number(getVal(['Marketplace Fees', 'Commission'])) || 0;
                const gstOnFees = Number(getVal(['GST on Fees', 'Tax on Fees', 'Taxes'])) || 0;
                const productCost = Number(getVal(['Product Cost'])) || 0;
                const bankSettlement = Number(getVal(['Bank Settlement', 'Settlement Amount'])) || 0;
                const inputGstCredit = Number(getVal(['Input GST Credit', 'GST Credit', 'GST + TCS'])) || 0;
                const tdsCredit = Number(getVal(['TDS Credit', 'TDS', 'Income Tax'])) || 0;
                const orderItemValue = Number(getVal(['Order Item Value', 'Item Value'])) || 0;
                const customerLogisticsFee = Number(getVal(['Customer Logistics Fee', 'Logistics Fee'])) || 0;
                const refundAmount = Number(getVal(['Refund Amount', 'Refund'])) || 0;
                const totalDiscount = Number(getVal(['Total Discount', 'Discount'])) || 0;
                const returnProductStatus = getVal(['Return Product Status', 'Product Condition', 'Return Status'])?.toString() as 'Working' | 'Damaged' | undefined;

                const deliveryStatus = (() => {
                    const statusVal = getVal(['Status', 'Delivery Status'])?.toString().toLowerCase() || '';
                    if (statusVal.includes('return')) return 'CustomerReturn';
                    if (statusVal.includes('cancel')) return 'Cancellation';
                    if (statusVal.includes('sale') || statusVal.includes('deliver')) return 'Sale';
                    return 'Sale';
                })() as 'Sale' | 'CustomerReturn' | 'LogisticsReturn' | 'Cancellation';

                // Auto-calculate Profit/Loss if it's missing or 0
                let profitLoss = Number(getVal(['Profit/Loss', 'Profit', 'Loss', 'P&L'])) || 0;
                if (profitLoss === 0) {
                    if (productCost !== 0) {
                        profitLoss = productCost + inputGstCredit + tdsCredit;
                    } else {
                        if (deliveryStatus === 'Sale') {
                            profitLoss = (sellerPrice - totalDiscount) - marketplaceFees - gstOnFees;
                        } else if (deliveryStatus === 'CustomerReturn' || deliveryStatus === 'LogisticsReturn') {
                            profitLoss = (sellerPrice - totalDiscount) - refundAmount + customerLogisticsFee + marketplaceFees + gstOnFees;
                        } else if (deliveryStatus === 'Cancellation') {
                            profitLoss = (orderItemValue - totalDiscount) - customerLogisticsFee;
                        }
                    }
                }

                // Sanitize rawData to remove undefined values
                const sanitizedRawData = Object.keys(row).reduce((acc, key) => {
                    const val = row[key];
                    if (val !== undefined) acc[key] = val;
                    return acc;
                }, {} as any);

                const order: Omit<FlipkartOrder, 'id'> = {
                    channel: getVal(['Channel'])?.toString() || 'Flipkart',
                    orderId: getVal(['Order ID', 'Order Id', 'OrderID'])?.toString() || '',
                    orderItemId: getVal(['Order Item ID', 'Item ID', 'OrderItemID'])?.toString() || '',
                    dispatchedDate: getVal(['Dispatched Date', 'Dispatch Date'])?.toString() || '',
                    paymentDate: getVal(['Payment Date'])?.toString() || '',
                    sku: getVal(['SKU', 'Seller SKU', 'FSN'])?.toString() || '',
                    quantity: Number(getVal(['Quantity', 'Qty'])) || 0,
                    paymentMode: (getVal(['Payment Mode', 'Payment Type'])?.toString() === 'Postpaid' ? 'Postpaid' : 'Prepaid') as 'Prepaid' | 'Postpaid',
                    hsnCode: getVal(['HSN Code', 'HSN'])?.toString() || '',
                    fromState: getVal(['From State', 'Origin State'])?.toString() || 'IN-TS',
                    toState: getVal(['To State', 'Destination State'])?.toString() || '',
                    orderItemValue,
                    customerLogisticsFee,
                    sellerPrice,
                    marketplaceFees,
                    gstOnFees,
                    productCost,
                    bankSettlement,
                    inputGstCredit,
                    tdsCredit,
                    deliveryStatus,
                    returnProductStatus: returnProductStatus || 'Working',
                    refundAmount,
                    totalDiscount,
                    profitLoss: Number(profitLoss.toFixed(2)),
                    uploadDate,
                    rawData: sanitizedRawData
                };

                await add(order);
            }

            setSaveSuccess(true);
            setParsedData([]); // Clear parsed data after successful save
            setFileName(null);
        } catch (err: any) {
            console.error("Error saving to Firebase:", err);
            setError(`Failed to save data: ${err.message || 'Unknown error'}. Please check if the Excel data format is correct.`);
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

        const confirmed = window.confirm(
            `Are you sure you want to delete this order?\n\nOrder ID: ${order.orderId}\nSKU: ${order.sku}`
        );

        if (confirmed) {
            try {
                await remove(order.id);
            } catch (err) {
                console.error("Error deleting order:", err);
                alert("Failed to delete order. Please try again.");
            }
        }
    };

    const handleSaveOrder = async (updatedOrder: FlipkartOrder) => {
        if (!updatedOrder.id) return;

        try {
            await update(updatedOrder.id, updatedOrder);
            setModalOpen(false);
            setSelectedOrder(null);
        } catch (err) {
            console.error("Error updating order:", err);
            alert("Failed to update order. Please try again.");
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
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedIds(newSelection);
    };

    const handleBulkDelete = async () => {
        const count = selectedIds.size;
        if (count === 0) return;

        const confirmed = window.confirm(`Are you sure you want to delete ${count} selected orders?`);
        if (!confirmed) return;

        setSaving(true);
        setError(null);
        try {
            for (const id of Array.from(selectedIds)) {
                await remove(id);
            }
            setSelectedIds(new Set());
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: any) {
            console.error("Error deleting orders:", err);
            setError(`Failed to delete some orders: ${err.message || 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleExportExcel = () => {
        if (savedOrders.length === 0) return;

        // Prepare data for export
        const exportData = savedOrders.map(order => ({
            'Channel': order.channel || 'Flipkart',
            'Order ID': order.orderId || '',
            'Order Item ID': order.orderItemId || '',
            'Dispatched Date': order.dispatchedDate || '',
            'Payment Date': order.paymentDate || '',
            'SKU': order.sku || '',
            'Quantity': order.quantity || 0,
            'Payment Mode': order.paymentMode || '',
            'HSN Code': order.hsnCode || '',
            'From State': order.fromState || '',
            'To State': order.toState || '',
            'Order Item Value': order.orderItemValue || 0,
            'Customer Logistics Fee': order.customerLogisticsFee || 0,
            'Seller Price': order.sellerPrice || 0,
            'Marketplace Fees': order.marketplaceFees || 0,
            'GST on Fees': order.gstOnFees || 0,
            'Product Cost': order.productCost || 0,
            'Bank Settlement': order.bankSettlement || 0,
            'Input GST Credit': order.inputGstCredit || 0,
            'TDS Credit': order.tdsCredit || 0,
            'Delivery Status': order.deliveryStatus || '',
            'Return Status': (order.deliveryStatus === 'CustomerReturn' || order.deliveryStatus === 'LogisticsReturn') ? order.returnProductStatus || 'Working' : '',
            'Refund Amount': order.refundAmount || 0,
            'Total Discount': order.totalDiscount || 0,
            'Profit/Loss': order.profitLoss || 0,
            'Upload Date': order.uploadDate || ''
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Flipkart Orders");

        // Generate filename with date
        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Flipkart_Orders_Report_${date}.xlsx`);
    };

    // Filter logic
    const filteredOrders = React.useMemo(() => {
        if (!searchTerm) return savedOrders;
        const lowSearch = searchTerm.toLowerCase();
        return savedOrders.filter(order =>
            order.orderId?.toLowerCase().includes(lowSearch) ||
            order.orderItemId?.toLowerCase().includes(lowSearch) ||
            order.sku?.toLowerCase().includes(lowSearch)
        );
    }, [savedOrders, searchTerm]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="h3 mb-0 fw-bold text-gray-800">Flipkart Order Report</h2>
                <button
                    className="btn btn-outline-primary d-flex align-items-center gap-2"
                    onClick={handleExportExcel}
                    disabled={savedOrders.length === 0}
                >
                    <Download size={18} />
                    Export to Excel
                </button>
            </div>

            {/* Upload Section */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                    <div className="d-flex flex-column align-items-center justify-content-center border-2 border-dashed border-primary rounded-3 p-5 bg-light" style={{ borderStyle: 'dashed' }}>
                        <Upload size={48} className="text-primary mb-3" />
                        <h5 className="fw-bold mb-2">Upload Flipkart Excel Report</h5>
                        <p className="text-secondary mb-4">Supported formats: .xlsx, .xls</p>

                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileUpload}
                            className="d-none"
                            id="excel-upload"
                        />
                        <label htmlFor="excel-upload" className="btn btn-primary px-4 py-2">
                            <FileSpreadsheet className="me-2" size={18} />
                            Select File
                        </label>
                        {fileName && <p className="mt-3 text-success fw-medium">Selected: {fileName}</p>}
                        {error && (
                            <div className="mt-3 text-danger d-flex align-items-center">
                                <AlertCircle size={18} className="me-2" />
                                {error}
                            </div>
                        )}
                        {saveSuccess && (
                            <div className="mt-3 text-success d-flex align-items-center">
                                <CheckCircle size={18} className="me-2" />
                                Successfully saved orders to Firebase!
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Parsed Data Preview */}
            {parsedData.length > 0 && (
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header bg-white py-3 border-0 d-flex justify-content-between align-items-center">
                        <h5 className="mb-0 fw-bold">Parsed Data ({parsedData.length} records)</h5>
                        <button
                            className="btn btn-success d-flex align-items-center gap-2"
                            onClick={handleSaveToFirebase}
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <Loader size={18} className="spinner-border spinner-border-sm" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save to Firebase
                                </>
                            )}
                        </button>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        {Object.keys(parsedData[0]).map((key) => (
                                            <th key={key} className="px-4 py-3 text-secondary text-uppercase small fw-bold text-nowrap">
                                                {key}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedData.map((row, index) => (
                                        <tr key={index}>
                                            {Object.values(row).map((val: any, i) => (
                                                <td key={i} className="px-4 py-3 text-nowrap">
                                                    {val !== null && val !== undefined ? String(val) : '-'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Saved Orders from Firebase */}
            <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3 border-0 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                    <h5 className="mb-0 fw-bold">Saved Orders ({firestoreLoading ? '...' : filteredOrders.length})</h5>
                    <div className="d-flex align-items-center gap-3">
                        {selectedIds.size > 0 && (
                            <button
                                className="btn btn-danger d-flex align-items-center gap-2 px-3 py-1.5 rounded-pill shadow-sm"
                                onClick={handleBulkDelete}
                                disabled={saving}
                            >
                                <Trash2 size={16} />
                                <span>Delete Selected ({selectedIds.size})</span>
                            </button>
                        )}
                        <div className="position-relative" style={{ minWidth: '300px' }}>
                            <div className="position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary">
                                <Search size={18} />
                            </div>
                            <input
                                type="text"
                                className="form-control ps-5 pe-5 py-2 rounded-pill border-light bg-light"
                                placeholder="Search Order ID, SKU, Item ID..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1); // Reset to first page on search
                                }}
                            />
                            {searchTerm && (
                                <button
                                    className="btn btn-link position-absolute top-50 end-0 translate-middle-y me-2 text-secondary p-0"
                                    onClick={() => setSearchTerm('')}
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                <div className="card-body p-0">
                    {firestoreLoading ? (
                        <div className="text-center py-5">
                            <Loader size={32} className="spinner-border text-primary" />
                            <p className="mt-3 text-secondary">Loading saved orders...</p>
                        </div>
                    ) : savedOrders.length === 0 ? (
                        <div className="text-center py-5 text-secondary">
                            <FileSpreadsheet size={48} className="mb-3 opacity-50" />
                            <p>{searchTerm ? 'No orders match your search criteria.' : 'No saved orders yet. Upload and save an Excel file to get started.'}</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0 small">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="px-3 py-2 text-center" style={{ width: '40px' }}>
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={paginatedOrders.length > 0 && paginatedOrders.every(o => o.id && selectedIds.has(o.id))}
                                                onChange={handleToggleSelectAll}
                                            />
                                        </th>
                                        <th className="px-3 py-2 text-secondary text-uppercase small fw-bold">Order ID</th>
                                        <th className="px-3 py-2 text-secondary text-uppercase small fw-bold">Item ID</th>
                                        <th className="px-3 py-2 text-secondary text-uppercase small fw-bold">SKU</th>
                                        <th className="px-3 py-2 text-secondary text-uppercase small fw-bold text-center">Qty</th>
                                        <th className="px-3 py-2 text-secondary text-uppercase small fw-bold">Payment</th>
                                        <th className="px-3 py-2 text-secondary text-uppercase small fw-bold">Seller Price</th>
                                        <th className="px-3 py-2 text-secondary text-uppercase small fw-bold">Fees</th>
                                        <th className="px-3 py-2 text-secondary text-uppercase small fw-bold">Product Cost</th>
                                        <th className="px-3 py-2 text-secondary text-uppercase small fw-bold">Settlement</th>
                                        <th className="px-3 py-2 text-secondary text-uppercase small fw-bold">Return Status</th>
                                        <th className="px-3 py-2 text-secondary text-uppercase small fw-bold">Status</th>
                                        <th className="px-3 py-2 text-secondary text-uppercase small fw-bold">P/L</th>
                                        <th className="px-3 py-2 text-secondary text-uppercase small fw-bold text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedOrders.map((order) => (
                                        <tr key={order.id} className={order.id && selectedIds.has(order.id) ? 'bg-primary bg-opacity-10' : ''}>
                                            <td className="px-3 py-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    checked={order.id ? selectedIds.has(order.id) : false}
                                                    onChange={() => order.id && handleToggleSelect(order.id)}
                                                />
                                            </td>
                                            <td className="px-3 py-2">{order.orderId || '-'}</td>
                                            <td className="px-3 py-2">{order.orderItemId || '-'}</td>
                                            <td className="px-3 py-2">{order.sku || '-'}</td>
                                            <td className="px-3 py-2 text-center">{order.quantity || 0}</td>
                                            <td className="px-3 py-2">
                                                <span className={`badge ${order.paymentMode === 'Prepaid' ? 'bg-success' : 'bg-warning'}`}>
                                                    {order.paymentMode || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2">₹{order.sellerPrice?.toFixed(2) || '0.00'}</td>
                                            <td className="px-3 py-2">₹{order.marketplaceFees?.toFixed(2) || '0.00'}</td>
                                            <td className="px-3 py-2">₹{order.productCost?.toFixed(2) || '0.00'}</td>
                                            <td className="px-3 py-2">₹{order.bankSettlement?.toFixed(2) || '0.00'}</td>
                                            <td className="px-3 py-2">
                                                {(order.deliveryStatus === 'CustomerReturn' || order.deliveryStatus === 'LogisticsReturn') && (
                                                    <span className={`badge ${order.returnProductStatus === 'Working' ? 'bg-success' : 'bg-danger'}`}>
                                                        {order.returnProductStatus || 'Working'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className={`badge ${order.deliveryStatus === 'Sale' ? 'bg-success' :
                                                    order.deliveryStatus === 'CustomerReturn' ? 'bg-warning' :
                                                        order.deliveryStatus === 'LogisticsReturn' ? 'bg-info' :
                                                            order.deliveryStatus === 'Cancellation' ? 'bg-danger' :
                                                                'bg-secondary'
                                                    }`}>
                                                    {order.deliveryStatus || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className={order.profitLoss && order.profitLoss >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                                                    ₹{order.profitLoss?.toFixed(2) || '0.00'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="d-flex gap-1 justify-content-center">
                                                    <button
                                                        className="btn btn-sm btn-outline-primary p-1"
                                                        onClick={() => handleView(order)}
                                                        title="View Details"
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-success p-1"
                                                        onClick={() => handleEdit(order)}
                                                        title="Edit Order"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-danger p-1"
                                                        onClick={() => handleDelete(order)}
                                                        title="Delete Order"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                {/* Pagination Controls */}
                {savedOrders.length > ITEMS_PER_PAGE && (
                    <div className="card-footer bg-white border-0 py-3 d-flex justify-content-between align-items-center border-top">
                        <div className="text-secondary small">
                            Showing <span className="fw-bold">{filteredOrders.length > 0 ? startIndex + 1 : 0}</span> to <span className="fw-bold">{Math.min(startIndex + ITEMS_PER_PAGE, filteredOrders.length)}</span> of <span className="fw-bold">{filteredOrders.length}</span> orders
                        </div>
                        <nav>
                            <ul className="pagination pagination-sm mb-0 gap-1">
                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                    <button
                                        className="page-link rounded border-0"
                                        onClick={() => handlePageChange(currentPage - 1)}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                </li>

                                {[...Array(totalPages)].map((_, i) => {
                                    const pageNum = i + 1;
                                    // Show first, last, and pages around current
                                    if (
                                        pageNum === 1 ||
                                        pageNum === totalPages ||
                                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                    ) {
                                        return (
                                            <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                                                <button
                                                    className={`page-link rounded border-0 ${currentPage === pageNum ? 'bg-primary text-white' : ''}`}
                                                    onClick={() => handlePageChange(pageNum)}
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
                                        onClick={() => handlePageChange(currentPage + 1)}
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
            <FlipkartOrderModal
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setSelectedOrder(null);
                }}
                order={selectedOrder}
                onSave={handleSaveOrder}
                mode={modalMode}
            />
        </div>
    );
};

export default FlipkartReport;
