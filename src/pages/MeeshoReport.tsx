import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Plus, Download, Eye, Edit2, Trash2, ChevronLeft, ChevronRight, Loader, FileSpreadsheet, Upload, AlertCircle, Save, CheckCircle, Search, X } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import type { MeeshoOrder } from '../types';
import MeeshoOrderModal from '../components/MeeshoOrderModal';

const MeeshoReport: React.FC = () => {
    const { data: savedOrders, add, update, remove, loading: firestoreLoading } = useFirestore<MeeshoOrder>('meeshoOrders');
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
    const [selectedOrder, setSelectedOrder] = useState<MeeshoOrder | null>(null);
    const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');

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

                const order: Omit<MeeshoOrder, 'id'> = {
                    channel: 'meesho',
                    orderId: getVal(['Order ID', 'Order Number'])?.toString() || '',
                    subOrderId: getVal(['Sub Order ID', 'Sub Order Number'])?.toString() || '',
                    subOrderContribution: (getVal(['Contribution', 'Status', 'Sub Order Status'])?.toString().includes('RTO') ? 'RTO' :
                        getVal(['Contribution', 'Status', 'Sub Order Status'])?.toString().includes('Return') ? 'Return' : 'Delivered') as 'Delivered' | 'RTO' | 'Return',
                    paymentStatus: {
                        ordered: getVal(['Ordered Date', 'Order Date'])?.toString() || '',
                        shipped: getVal(['Shipped Date'])?.toString() || '',
                        delivered: getVal(['Delivered Date'])?.toString() || '',
                        returned: getVal(['Returned Date'])?.toString() || '',
                        rto: getVal(['RTO Date'])?.toString() || '',
                        paymentPaid: getVal(['Payment Date', 'Payment Paid Date'])?.toString() || ''
                    },
                    productDetails: {
                        productName: getVal(['Product Name', 'Title'])?.toString() || '',
                        skuCode: getVal(['SKU', 'SKU Code'])?.toString() || '',
                        hsnCode: getVal(['HSN Code', 'HSN'])?.toString() || '',
                        quantity: Number(getVal(['Quantity', 'Qty'])) || 0,
                        productCost: Number(getVal(['Product Cost', 'Unit Price'])) || 0,
                        gstRate: Number(getVal(['GST Rate', 'Tax Rate'])) || 0
                    },
                    revenue: {
                        saleRevenue: Number(getVal(['Sale Revenue', 'Revenue', 'Sale Amount'])) || 0,
                        shippingRevenue: Number(getVal(['Shipping Revenue', 'Shipping Charge'])) || 0,
                        salesReturns: Number(getVal(['Sales Returns', 'Return Amount'])) || 0,
                        shippingReturns: Number(getVal(['Shipping Returns'])) || 0,
                        forwardShippingRecovery: Number(getVal(['Forward Shipping Recovery'])) || 0,
                        totalSaleAmount: Number(getVal(['Total Sale Amount', 'Total Sale', 'Sale Amount Incl Tax'])) || 0
                    },
                    deductions: {
                        meeshoCommission: Number(getVal(['Meesho Commission', 'Commission'])) || 0,
                        warehousingFee: Number(getVal(['Warehousing Fee'])) || 0,
                        shippingCharge: Number(getVal(['Shipping Charge'])) || 0,
                        returnShippingCharge: Number(getVal(['Return Shipping Charge'])) || 0
                    },
                    settlement: {
                        tcsInputCredits: Number(getVal(['TCS Input Credits', 'TCS'])) || 0,
                        tdsDeduction: Number(getVal(['TDS Deduction', 'TDS'])) || 0
                    },
                    summary: {
                        bankSettlement: Number(getVal(['Bank Settlement', 'Settlement Amount', 'Net Payment'])) || 0,
                        gst: Number(getVal(['GST Amount', 'Total GST', 'GST'])) || 0,
                        profitLoss: Number(getVal(['Profit/Loss', 'Profit', 'Loss'])) || 0
                    },
                    uploadDate
                };

                // Auto-calculate GST if it's 0 and we have totalSaleAmount
                if (order.summary.gst === 0 && (order.revenue.totalSaleAmount || 0) !== 0 && order.productDetails.gstRate !== 0) {
                    const gstRate = order.productDetails.gstRate;
                    order.summary.gst = Number((((order.revenue.totalSaleAmount || 0) * gstRate) / (100 + gstRate)).toFixed(2));
                }

                // Auto-calculate Profit/Loss if it's 0
                if (order.summary.profitLoss === 0) {
                    const productCostTotal = order.productDetails.quantity * order.productDetails.productCost;
                    if (order.subOrderContribution === 'Delivered') {
                        order.summary.profitLoss = Number((order.summary.bankSettlement - productCostTotal).toFixed(2));
                    } else {
                        order.summary.profitLoss = order.summary.bankSettlement;
                    }
                }

                await add(order as any);
            }

            setSaveSuccess(true);
            setParsedData([]);
            setFileName(null);
        } catch (err: any) {
            console.error("Error saving to Firebase:", err);
            setError(`Failed to save data: ${err.message || 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleAdd = () => {
        setSelectedOrder({
            channel: 'meesho',
            orderId: '',
            subOrderId: '',
            subOrderContribution: 'Delivered',
            paymentStatus: {
                ordered: '',
                shipped: '',
                delivered: '',
                returned: '',
                rto: '',
                paymentPaid: ''
            },
            productDetails: {
                productName: '',
                skuCode: '',
                hsnCode: '',
                quantity: 0,
                productCost: 0,
                gstRate: 0
            },
            revenue: {
                saleRevenue: 0,
                shippingRevenue: 0,
                salesReturns: 0,
                shippingReturns: 0
            },
            deductions: {
                meeshoCommission: 0,
                warehousingFee: 0,
                shippingCharge: 0,
                returnShippingCharge: 0
            },
            settlement: {
                tcsInputCredits: 0,
                tdsDeduction: 0
            },
            summary: {
                bankSettlement: 0,
                gst: 0,
                profitLoss: 0
            },
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

        const confirmed = window.confirm(
            `Are you sure you want to delete this order?\n\nOrder ID: ${order.orderId}\nSub Order ID: ${order.subOrderId}`
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
            alert("Failed to save order. Please try again.");
        }
    };

    const handleExportExcel = () => {
        if (savedOrders.length === 0) return;

        const exportData = savedOrders.map(order => ({
            'Order ID': order.orderId,
            'Sub Order ID': order.subOrderId,
            'Contribution': order.subOrderContribution,
            'Product Name': order.productDetails.productName,
            'SKU': order.productDetails.skuCode,
            'Qty': order.productDetails.quantity,
            'Total Sale Amount': order.revenue.totalSaleAmount || 0,
            'Bank Settlement': order.summary.bankSettlement,
            'GST Amount': order.summary.gst,
            'Profit/Loss': order.summary.profitLoss,
            'Ordered Date': order.paymentStatus.ordered,
            'Delivered Date': order.paymentStatus.delivered,
            'Payment Paid Date': order.paymentStatus.paymentPaid
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Meesho Orders");
        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Meesho_Orders_Report_${date}.xlsx`);
    };

    // Filter logic
    const filteredOrders = React.useMemo(() => {
        if (!searchTerm) return savedOrders;
        const lowSearch = searchTerm.toLowerCase();
        return savedOrders.filter(order =>
            order.orderId?.toLowerCase().includes(lowSearch) ||
            order.subOrderId?.toLowerCase().includes(lowSearch) ||
            order.productDetails.skuCode?.toLowerCase().includes(lowSearch)
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
                <h2 className="h3 mb-0 fw-bold text-gray-800">Meesho Order Report</h2>
                <div className="d-flex gap-2">
                    <button
                        className="btn btn-primary d-flex align-items-center gap-2"
                        onClick={handleAdd}
                    >
                        <Plus size={18} />
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
                </div>
            </div>

            {/* Error State Section */}
            {error && (
                <div className="alert alert-danger border-0 shadow-sm mb-4 d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                        <div className="bg-danger bg-opacity-10 p-2 rounded-circle me-3">
                            <AlertCircle size={20} className="text-danger" />
                        </div>
                        <div>
                            <h6 className="alert-heading mb-1 fw-bold">Error Occurred</h6>
                            <p className="mb-0 small">{error}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn-close"
                        onClick={() => setError(null)}
                        aria-label="Close"
                    ></button>
                </div>
            )}

            {/* Upload Section */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                    <div className="d-flex flex-column align-items-center justify-content-center border-2 border-dashed border-primary rounded-3 p-5 bg-light" style={{ borderStyle: 'dashed' }}>
                        <Upload size={48} className="text-primary mb-3" />
                        <h5 className="fw-bold mb-2">Upload Meesho Excel Report</h5>
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
                                    {parsedData.slice(0, 10).map((row, index) => (
                                        <tr key={index}>
                                            {Object.values(row).map((val: any, i) => (
                                                <td key={i} className="px-4 py-3 text-nowrap">
                                                    {val !== null && val !== undefined ? String(val) : '-'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {parsedData.length > 10 && (
                                        <tr>
                                            <td colSpan={Object.keys(parsedData[0]).length} className="text-center py-3 text-secondary">
                                                ... and {parsedData.length - 10} more records
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3 border-0 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                    <h5 className="mb-0 fw-bold">Saved Orders ({firestoreLoading ? '...' : filteredOrders.length})</h5>
                    <div className="position-relative" style={{ minWidth: '300px' }}>
                        <div className="position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            className="form-control ps-5 pe-5 py-2 rounded-pill border-light bg-light"
                            placeholder="Search Order ID, Sub Order ID, SKU..."
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
                <div className="card-body p-0">
                    {firestoreLoading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary mb-3" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p className="text-secondary fw-medium">Fetching orders from Firestore...</p>
                        </div>
                    ) : savedOrders.length === 0 ? (
                        <div className="text-center py-5 px-4">
                            <div className="bg-light rounded-circle d-inline-flex p-4 mb-3">
                                <FileSpreadsheet size={48} className="text-muted opacity-50" />
                            </div>
                            <h5 className="fw-bold text-gray-800 mb-2">No Meesho Orders Found</h5>
                            <p className="text-secondary mb-4 mx-auto" style={{ maxWidth: '400px' }}>
                                {searchTerm
                                    ? `No orders match your search "${searchTerm}". Try a different term or clear the search.`
                                    : 'You haven\'t added any Meesho orders yet. Upload an Excel file or add one manually to get started.'}
                            </p>
                            {!searchTerm ? (
                                <div className="d-flex gap-2 justify-content-center">
                                    <label htmlFor="excel-upload" className="btn btn-primary px-4">
                                        <Upload size={18} className="me-2" />
                                        Upload Excel
                                    </label>
                                    <button className="btn btn-outline-primary px-4" onClick={handleAdd}>
                                        <Plus size={18} className="me-2" />
                                        Add Manually
                                    </button>
                                </div>
                            ) : (
                                <button className="btn btn-link text-primary" onClick={() => setSearchTerm('')}>
                                    Clear Search
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0 small text-nowrap">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="px-3 py-2 text-secondary text-uppercase small fw-bold">Order ID</th>
                                        <th className="px-3 py-2 text-secondary text-uppercase small fw-bold">Sub Order ID</th>
                                        <th className="px-3 py-2 text-secondary text-uppercase small fw-bold">SKU</th>
                                        <th className="px-3 py-2 text-secondary text-uppercase small fw-bold">Qty</th>
                                        <th className="px-3 py-2 text-secondary text-uppercase small fw-bold">Contribution</th>
                                        <th className="px-3 py-2 text-secondary text-uppercase small fw-bold text-end">Settlement</th>
                                        <th className="px-3 py-2 text-secondary text-uppercase small fw-bold text-end">GST</th>
                                        <th className="px-3 py-2 text-secondary text-uppercase small fw-bold text-end">P/L</th>
                                        <th className="px-3 py-2 text-secondary text-uppercase small fw-bold text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedOrders.map((order) => (
                                        <tr key={order.id}>
                                            <td className="px-3 py-2">{order.orderId || '-'}</td>
                                            <td className="px-3 py-2">{order.subOrderId || '-'}</td>
                                            <td className="px-3 py-2">{order.productDetails.skuCode || '-'}</td>
                                            <td className="px-3 py-2">{order.productDetails.quantity || 0}</td>
                                            <td className="px-3 py-2">
                                                <span className={`badge ${order.subOrderContribution === 'Delivered' ? 'bg-success' :
                                                    order.subOrderContribution === 'RTO' ? 'bg-warning' : 'bg-danger'
                                                    }`}>
                                                    {order.subOrderContribution || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-end">₹{order.summary.bankSettlement?.toFixed(2) || '0.00'}</td>
                                            <td className="px-3 py-2 text-end text-primary">₹{(order.summary.gst || 0).toFixed(2)}</td>
                                            <td className="px-3 py-2 text-end">
                                                <span className={order.summary.profitLoss && order.summary.profitLoss >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                                                    ₹{order.summary.profitLoss?.toFixed(2) || '0.00'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <div className="d-flex gap-1 justify-content-center">
                                                    <button className="btn btn-sm btn-outline-primary p-1" onClick={() => handleView(order)} title="View Detail">
                                                        <Eye size={14} />
                                                    </button>
                                                    <button className="btn btn-sm btn-outline-success p-1" onClick={() => handleEdit(order)} title="Edit Record">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button className="btn btn-sm btn-outline-danger p-1" onClick={() => handleDelete(order)} title="Delete Record">
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
                {!firestoreLoading && savedOrders.length > ITEMS_PER_PAGE && (
                    <div className="card-footer bg-white border-0 py-3 d-flex flex-column flex-md-row justify-content-between align-items-center border-top gap-3">
                        <div className="text-secondary small">
                            Showing <span className="fw-bold text-dark">{filteredOrders.length > 0 ? startIndex + 1 : 0}</span> to <span className="fw-bold text-dark">{Math.min(startIndex + ITEMS_PER_PAGE, filteredOrders.length)}</span> of <span className="fw-bold text-dark">{filteredOrders.length}</span> orders
                        </div>
                        <nav>
                            <ul className="pagination pagination-sm mb-0 gap-1">
                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link rounded border-0 shadow-none" onClick={() => handlePageChange(currentPage - 1)}>
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
                                                    className={`page-link rounded border-0 shadow-none ${currentPage === pageNum ? 'bg-primary text-white' : 'bg-white text-dark'}`}
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
                                        return (
                                            <li key={pageNum} className="page-item disabled">
                                                <span className="page-link border-0 bg-transparent">...</span>
                                            </li>
                                        );
                                    }
                                    return null;
                                })}

                                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                    <button className="page-link rounded border-0 shadow-none" onClick={() => handlePageChange(currentPage + 1)}>
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
