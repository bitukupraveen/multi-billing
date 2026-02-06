import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Upload, AlertCircle, Save, CheckCircle, Loader, Eye, Edit2, Trash2, Download, ChevronLeft, ChevronRight, Search, TrendingUp, DollarSign, Percent } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import type { FlipkartGSTReportRecord } from '../types';
import FlipkartGSTReportModal from '../components/FlipkartGSTReportModal';

const FlipkartGSTReport: React.FC = () => {
    const { data: savedReports, add, update, remove, loading: firestoreLoading } = useFirestore<FlipkartGSTReportRecord>('flipkartGstReports');

    const [parsedData, setParsedData] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Pagination and Search state
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<FlipkartGSTReportRecord | null>(null);
    const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setSaveSuccess(false);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const workbook = XLSX.read(bstr, { type: 'binary' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(worksheet);

                if (data.length === 0) throw new Error("No data found in the Excel file.");
                setParsedData(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to parse Excel file");
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
                const cleanRow = Object.fromEntries(
                    Object.entries(row).filter(([_, v]) => v !== undefined && v !== null)
                );

                const getVal = (keys: string[]) => {
                    const foundKey = Object.keys(cleanRow).find(rk =>
                        keys.some(k => rk.toLowerCase() === k.toLowerCase())
                    );
                    return foundKey ? cleanRow[foundKey] : undefined;
                };

                const report: Omit<FlipkartGSTReportRecord, 'id'> = {
                    sellerGstin: getVal(['Seller GSTIN'])?.toString() || '',
                    orderId: getVal(['Order ID'])?.toString() || '',
                    orderItemId: getVal(['Order Item ID'])?.toString() || '',
                    productTitle: getVal(['Product Title'])?.toString() || '',
                    fsn: getVal(['FSN'])?.toString() || '',
                    sku: getVal(['SKU'])?.toString() || '',
                    hsnCode: getVal(['HSN Code'])?.toString() || '',
                    eventType: getVal(['Event Type'])?.toString() || '',
                    eventSubType: getVal(['Event Sub Type'])?.toString() || '',
                    orderType: getVal(['Order Type'])?.toString() || '',
                    fulfilmentType: getVal(['Fulfilment Type'])?.toString() || '',
                    orderDate: getVal(['Order Date'])?.toString() || '',
                    orderApprovalDate: getVal(['Order Approval Date'])?.toString() || '',
                    itemQuantity: Number(getVal(['Item Quantity', 'Quantity'])) || 0,
                    shippedFromState: getVal(['Order Shipped From (State)', 'Shipped From'])?.toString() || '',
                    warehouseId: getVal(['Warehouse ID'])?.toString() || '',
                    priceBeforeDiscount: Number(getVal(['Price before discount'])) || 0,
                    totalDiscount: Number(getVal(['Total Discount'])) || 0,
                    sellerShare: Number(getVal(['Seller Share'])) || 0,
                    bankOfferShare: Number(getVal(['Bank Offer Share'])) || 0,
                    priceAfterDiscount: Number(getVal(['Price after discount', 'Price after discount (Price before discount-Total discount)'])) || 0,
                    shippingCharges: Number(getVal(['Shipping Charges'])) || 0,
                    finalInvoiceAmount: Number(getVal(['Final Invoice Amount', 'Final Invoice Amount (Price after discount+Shipping Charges)'])) || 0,
                    taxType: getVal(['Type of tax', 'Tax Type'])?.toString() || '',
                    taxableValue: Number(getVal(['Taxable Value', 'Taxable Value (Final Invoice Amount -Taxes)'])) || 0,
                    cstRate: Number(getVal(['CST Rate'])) || 0,
                    cstAmount: Number(getVal(['CST Amount'])) || 0,
                    vatRate: Number(getVal(['VAT Rate'])) || 0,
                    vatAmount: Number(getVal(['VAT Amount'])) || 0,
                    luxuryCessRate: Number(getVal(['Luxury Cess Rate'])) || 0,
                    luxuryCessAmount: Number(getVal(['Luxury Cess Amount'])) || 0,
                    igstRate: Number(getVal(['IGST Rate'])) || 0,
                    igstAmount: Number(getVal(['IGST Amount'])) || 0,
                    cgstRate: Number(getVal(['CGST Rate'])) || 0,
                    cgstAmount: Number(getVal(['CGST Amount'])) || 0,
                    sgstRate: Number(getVal(['SGST Rate', 'SGST Rate (or UTGST as applicable)'])) || 0,
                    sgstAmount: Number(getVal(['SGST Amount', 'SGST Amount (Or UTGST as applicable)'])) || 0,
                    tcsIgstRate: Number(getVal(['TCS IGST Rate'])) || 0,
                    tcsIgstAmount: Number(getVal(['TCS IGST Amount'])) || 0,
                    tcsCgstRate: Number(getVal(['TCS CGST Rate'])) || 0,
                    tcsCgstAmount: Number(getVal(['TCS CGST Amount'])) || 0,
                    tcsSgstRate: Number(getVal(['TCS SGST Rate'])) || 0,
                    tcsSgstAmount: Number(getVal(['TCS SGST Amount'])) || 0,
                    totalTcsDeducted: Number(getVal(['Total TCS Deducted'])) || 0,
                    buyerInvoiceId: getVal(['Buyer Invoice ID'])?.toString() || '',
                    buyerInvoiceDate: getVal(['Buyer Invoice Date'])?.toString() || '',
                    buyerInvoiceAmount: Number(getVal(['Buyer Invoice Amount'])) || 0,
                    billingPincode: getVal(["Customer's Billing Pincode", 'Billing Pincode'])?.toString() || '',
                    billingState: getVal(["Customer's Billing State", 'Billing State'])?.toString() || '',
                    deliveryPincode: getVal(["Customer's Delivery Pincode", 'Delivery Pincode'])?.toString() || '',
                    deliveryState: getVal(["Customer's Delivery State", 'Delivery State'])?.toString() || '',
                    usualPrice: Number(getVal(['Usual Price'])) || 0,
                    isShopsyOrder: getVal(['Is Shopsy Order?'])?.toString() || 'No',
                    tdsRate: Number(getVal(['TDS Rate'])) || 0,
                    tdsAmount: Number(getVal(['TDS Amount'])) || 0,
                    irn: getVal(['IRN'])?.toString() || '',
                    businessName: getVal(['Business Name'])?.toString() || '',
                    businessGstNumber: getVal(['Business GST Number'])?.toString() || '',
                    beneficiaryName: getVal(['Beneficiary Name'])?.toString() || '',
                    imei: getVal(['IMEI'])?.toString() || '',
                    uploadDate,
                    rawData: cleanRow
                };

                // Fallback calculations if missing in Excel
                if (!report.priceAfterDiscount && report.priceBeforeDiscount) {
                    report.priceAfterDiscount = (report.priceBeforeDiscount || 0) - (report.totalDiscount || 0);
                }
                if (!report.finalInvoiceAmount && report.priceAfterDiscount) {
                    report.finalInvoiceAmount = (report.priceAfterDiscount || 0) + (report.shippingCharges || 0);
                }
                if (!report.taxableValue && report.finalInvoiceAmount) {
                    const totalTaxes = (report.igstAmount || 0) + (report.cgstAmount || 0) + (report.sgstAmount || 0) + (report.luxuryCessAmount || 0);
                    report.taxableValue = report.finalInvoiceAmount - totalTaxes;
                }

                await add(report);
            }

            setSaveSuccess(true);
            setParsedData([]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save reports");
        } finally {
            setSaving(false);
        }
    };

    const handleViewReport = (report: FlipkartGSTReportRecord) => {
        setSelectedReport(report);
        setModalMode('view');
        setModalOpen(true);
    };

    const handleEditReport = (report: FlipkartGSTReportRecord) => {
        setSelectedReport(report);
        setModalMode('edit');
        setModalOpen(true);
    };

    const handleSaveReport = async (updatedReport: FlipkartGSTReportRecord) => {
        if (!selectedReport?.id) return;
        try {
            await update(selectedReport.id, updatedReport);
            setModalOpen(false);
            setSelectedReport(null);
        } catch (err) {
            console.error("Failed to update report:", err);
            alert("Failed to update report");
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} records?`)) return;

        try {
            for (const id of selectedIds) {
                await remove(id);
            }
            setSelectedIds(new Set());
        } catch (err) {
            console.error("Failed to delete reports:", err);
            alert("Failed to delete some reports");
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const handleExportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(savedReports);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "GST Report");
        XLSX.writeFile(wb, `Flipkart_GST_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const filteredReports = savedReports.filter(report => {
        const searchLower = searchTerm.toLowerCase();
        return (
            (report.orderId || '').toLowerCase().includes(searchLower) ||
            (report.orderItemId || '').toLowerCase().includes(searchLower) ||
            (report.sku || '').toLowerCase().includes(searchLower) ||
            (report.productTitle || '').toLowerCase().includes(searchLower)
        );
    });

    const summaryStats = useMemo(() => {
        return filteredReports.reduce((acc, report) => {
            acc.totalSales += (report.finalInvoiceAmount || 0);
            acc.totalTaxable += (report.taxableValue || 0);
            acc.totalGst += (report.igstAmount || 0) + (report.cgstAmount || 0) + (report.sgstAmount || 0);
            return acc;
        }, { totalSales: 0, totalTaxable: 0, totalGst: 0 });
    }, [filteredReports]);

    const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedReports = filteredReports.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="h3 mb-0 fw-bold text-gray-800">Flipkart GST Report</h2>
                <div className="d-flex gap-2">
                    <button
                        className="btn btn-outline-primary d-flex align-items-center gap-2"
                        onClick={handleExportExcel}
                        disabled={savedReports.length === 0}
                    >
                        <Download size={18} />
                        Export to Excel
                    </button>
                    {selectedIds.size > 0 && (
                        <button
                            className="btn btn-danger d-flex align-items-center gap-2"
                            onClick={handleDeleteSelected}
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
                    <div className="card border-0 shadow-sm bg-primary text-white overflow-hidden h-100">
                        <div className="card-body p-3 position-relative">
                            <TrendingUp className="position-absolute opacity-25" style={{ right: '10px', bottom: '10px' }} size={48} />
                            <h6 className="text-uppercase small fw-bold opacity-75 mb-2">Total Sales</h6>
                            <h4 className="fw-bold mb-0">₹{summaryStats.totalSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h4>
                            <div className="small opacity-75 mt-1">Invoice Value</div>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm bg-info text-white overflow-hidden h-100">
                        <div className="card-body p-3 position-relative">
                            <DollarSign className="position-absolute opacity-25" style={{ right: '10px', bottom: '10px' }} size={48} />
                            <h6 className="text-uppercase small fw-bold opacity-75 mb-2">Taxable Value</h6>
                            <h4 className="fw-bold mb-0">₹{summaryStats.totalTaxable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h4>
                            <div className="small opacity-75 mt-1">Base Amount</div>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm bg-success text-white overflow-hidden h-100">
                        <div className="card-body p-3 position-relative">
                            <Percent className="position-absolute opacity-25" style={{ right: '10px', bottom: '10px' }} size={48} />
                            <h6 className="text-uppercase small fw-bold opacity-75 mb-2">Total GST</h6>
                            <h4 className="fw-bold mb-0">₹{summaryStats.totalGst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h4>
                            <div className="small opacity-75 mt-1">Liability</div>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm bg-secondary text-white overflow-hidden h-100">
                        <div className="card-body p-3 position-relative">
                            <h6 className="text-uppercase small fw-bold opacity-75 mb-2">Tax Breakdown</h6>
                            <div className="d-flex justify-content-between small mb-1">
                                <span>IGST:</span>
                                <span className="fw-bold">₹{filteredReports.reduce((acc, r) => acc + (r.igstAmount || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="d-flex justify-content-between small">
                                <span>CGST/SGST:</span>
                                <span className="fw-bold">₹{filteredReports.reduce((acc, r) => acc + (r.cgstAmount || 0) + (r.sgstAmount || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Section */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                    <div className="row align-items-center">
                        <div className="col-md-6">
                            <label className="d-block mb-3 fw-medium text-secondary">Upload GST Report Excel</label>
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
                            <div className="col-md-6 mt-3 mt-md-0 d-flex gap-2 mt-4">
                                <button
                                    className="btn btn-success flex-grow-1 d-flex align-items-center justify-content-center gap-2 py-2 shadow-sm"
                                    onClick={handleSaveToFirebase}
                                    disabled={saving}
                                >
                                    {saving ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
                                    Save {parsedData.length} GST Records
                                </button>
                                <button
                                    className="btn btn-outline-secondary py-2"
                                    onClick={() => { setParsedData([]); }}
                                >
                                    Cancel
                                </button>
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
                            <CheckCircle size={18} /> Records saved successfully!
                        </div>
                    )}
                </div>
            </div>

            {/* Table Section */}
            <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3 border-0">
                    <div className="row align-items-center">
                        <div className="col">
                            <h5 className="mb-0 fw-bold">Saved GST Report Records</h5>
                        </div>
                        <div className="col-md-4">
                            <div className="input-group input-group-sm">
                                <span className="input-group-text bg-white border-end-0">
                                    <Search size={16} className="text-secondary" />
                                </span>
                                <input
                                    type="text"
                                    className="form-control border-start-0 ps-0"
                                    placeholder="Search by Order ID, SKU, Title..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
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
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedIds(new Set(filteredReports.map(r => r.id!)));
                                            else setSelectedIds(new Set());
                                        }}
                                        checked={selectedIds.size === filteredReports.length && filteredReports.length > 0}
                                    />
                                </th>
                                <th>Order Info</th>
                                <th>Product Details</th>
                                <th>Financials</th>
                                <th>GST Breakdown</th>
                                <th>Upload Date</th>
                                <th className="text-end pe-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="border-top-0">
                            {firestoreLoading ? (
                                <tr><td colSpan={7} className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></td></tr>
                            ) : paginatedReports.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-5 text-secondary">No reports found</td></tr>
                            ) : (
                                paginatedReports.map((report) => (
                                    <tr key={report.id}>
                                        <td className="ps-4">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={selectedIds.has(report.id!)}
                                                onChange={() => toggleSelect(report.id!)}
                                            />
                                        </td>
                                        <td>
                                            <div className="fw-bold">{report.orderId}</div>
                                            <div className="small text-secondary">{report.orderItemId}</div>
                                            <span className="badge bg-light text-primary border border-primary-subtle mt-1">{report.eventType}</span>
                                        </td>
                                        <td>
                                            <div className="small fw-medium text-truncate" style={{ maxWidth: '200px' }}>{report.productTitle}</div>
                                            <div className="small text-secondary">SKU: {report.sku} | Qty: {report.itemQuantity}</div>
                                        </td>
                                        <td>
                                            <div className="small">Invoice: ₹{report.finalInvoiceAmount?.toFixed(2)}</div>
                                            <div className="small text-secondary">Taxable: ₹{report.taxableValue?.toFixed(2)}</div>
                                        </td>
                                        <td>
                                            <div className="small text-success">Total GST: ₹{((report.igstAmount || 0) + (report.cgstAmount || 0) + (report.sgstAmount || 0)).toFixed(2)}</div>
                                            <div className="small text-muted" style={{ fontSize: '0.7rem' }}>I:{report.igstAmount?.toFixed(1)} C:{report.cgstAmount?.toFixed(1)} S:{report.sgstAmount?.toFixed(1)}</div>
                                        </td>
                                        <td>
                                            <div className="small">{new Date(report.uploadDate).toLocaleDateString()}</div>
                                            <div className="small text-secondary">{new Date(report.uploadDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </td>
                                        <td className="text-end pe-4">
                                            <div className="d-flex justify-content-end gap-1">
                                                <button className="btn btn-sm btn-icon btn-light" onClick={() => handleViewReport(report)}><Eye size={16} className="text-primary" /></button>
                                                <button className="btn btn-sm btn-icon btn-light" onClick={() => handleEditReport(report)}><Edit2 size={16} className="text-success" /></button>
                                                <button className="btn btn-sm btn-icon btn-light" onClick={() => { if (window.confirm("Delete this report?")) remove(report.id!); }}><Trash2 size={16} className="text-danger" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredReports.length > ITEMS_PER_PAGE && (
                    <div className="card-footer bg-white border-0 py-3 d-flex justify-content-between align-items-center border-top">
                        <div className="text-secondary small">
                            Showing <span className="fw-bold">{filteredReports.length > 0 ? startIndex + 1 : 0}</span> to <span className="fw-bold">{Math.min(startIndex + ITEMS_PER_PAGE, filteredReports.length)}</span> of <span className="fw-bold">{filteredReports.length}</span> records
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

            <FlipkartGSTReportModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setSelectedReport(null); }}
                report={selectedReport}
                onSave={handleSaveReport}
                mode={modalMode}
            />
        </div>
    );
};

export default FlipkartGSTReport;
