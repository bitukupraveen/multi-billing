import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Upload, AlertCircle, Save, CheckCircle, Loader, Eye, Edit2, Trash2, Download, ChevronLeft, ChevronRight, Search, TrendingUp, DollarSign, Percent } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import type { MeeshoSalesRepoRecord } from '../types';
import MeeshoSalesRepoModal from '../components/MeeshoSalesRepoModal';

const MeeshoSalesRepo: React.FC = () => {
    const { data: savedReports, add, update, remove, loading: firestoreLoading } = useFirestore<MeeshoSalesRepoRecord>('meeshoSalesReports');

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
    const [selectedReport, setSelectedReport] = useState<MeeshoSalesRepoRecord | null>(null);
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
                        keys.some(k => rk.toLowerCase().replace(/\s/g, '').includes(k.toLowerCase().replace(/\s/g, '')))
                    );
                    return foundKey ? cleanRow[foundKey] : undefined;
                };

                const report: Omit<MeeshoSalesRepoRecord, 'id'> = {
                    identifier: getVal(['identifier'])?.toString(),
                    supName: getVal(['sup_name', 'supplier_name'])?.toString(),
                    gstin: getVal(['gstin'])?.toString(),
                    subOrderNum: getVal(['sub_order_num', 'sub_order_number'])?.toString(),
                    orderDate: getVal(['order_date'])?.toString(),
                    hsnCode: getVal(['hsn_code', 'hsn'])?.toString(),
                    quantity: Number(getVal(['quantity', 'qty'])) || 0,
                    gstRate: Number(getVal(['gst_rate'])) || 0,
                    totalTaxableSaleValue: Number(getVal(['total_taxable_sale_value', 'taxable_value'])) || 0,
                    taxAmount: Number(getVal(['tax_amount'])) || 0,
                    totalInvoiceValue: Number(getVal(['total_invoice_value', 'invoice_value'])) || 0,
                    taxableShipping: Number(getVal(['taxable_shipping'])) || 0,
                    endCustomerStateNew: getVal(['end_customer_state_new', 'customer_state'])?.toString(),
                    enrollmentNo: getVal(['enrollment_no'])?.toString(),
                    financialYear: getVal(['financial_year'])?.toString(),
                    monthNumber: Number(getVal(['month_number'])) || 0,
                    supplierId: getVal(['supplier_id'])?.toString(),
                    uploadDate,
                    rawData: cleanRow
                };

                // Fallback calculations if missing in Excel
                if (!report.totalInvoiceValue && report.totalTaxableSaleValue) {
                    report.totalInvoiceValue = (report.totalTaxableSaleValue || 0) + (report.taxAmount || 0) + (report.taxableShipping || 0);
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

    const handleViewReport = (report: MeeshoSalesRepoRecord) => {
        setSelectedReport(report);
        setModalMode('view');
        setModalOpen(true);
    };

    const handleEditReport = (report: MeeshoSalesRepoRecord) => {
        setSelectedReport(report);
        setModalMode('edit');
        setModalOpen(true);
    };

    const handleSaveReport = async (updatedReport: MeeshoSalesRepoRecord) => {
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
        XLSX.utils.book_append_sheet(wb, ws, "Meesho Sales Report");
        XLSX.writeFile(wb, `Meesho_Sales_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const filteredReports = savedReports.filter(report => {
        const searchLower = searchTerm.toLowerCase();
        return (
            (report.subOrderNum || '').toLowerCase().includes(searchLower) ||
            (report.identifier || '').toLowerCase().includes(searchLower) ||
            (report.supName || '').toLowerCase().includes(searchLower) ||
            (report.gstin || '').toLowerCase().includes(searchLower)
        );
    });

    const summaryStats = useMemo(() => {
        return filteredReports.reduce((acc, report) => {
            acc.totalSales += (report.totalInvoiceValue || 0);
            acc.totalTaxable += (report.totalTaxableSaleValue || 0);
            acc.totalTax += (report.taxAmount || 0);
            return acc;
        }, { totalSales: 0, totalTaxable: 0, totalTax: 0 });
    }, [filteredReports]);

    const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedReports = filteredReports.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="h3 mb-0 fw-bold text-gray-800">Meesho Sales Report</h2>
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
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm bg-primary text-white overflow-hidden">
                        <div className="card-body p-4 position-relative">
                            <TrendingUp className="position-absolute opacity-25" style={{ right: '20px', bottom: '20px' }} size={64} />
                            <h6 className="text-uppercase small fw-bold opacity-75 mb-3">Total Invoice Value</h6>
                            <h2 className="fw-bold mb-0">₹{summaryStats.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm bg-info text-white overflow-hidden">
                        <div className="card-body p-4 position-relative">
                            <DollarSign className="position-absolute opacity-25" style={{ right: '20px', bottom: '20px' }} size={64} />
                            <h6 className="text-uppercase small fw-bold opacity-75 mb-3">Total Taxable Value</h6>
                            <h2 className="fw-bold mb-0">₹{summaryStats.totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm bg-success text-white overflow-hidden">
                        <div className="card-body p-4 position-relative">
                            <Percent className="position-absolute opacity-25" style={{ right: '20px', bottom: '20px' }} size={64} />
                            <h6 className="text-uppercase small fw-bold opacity-75 mb-3">Total Tax Amount</h6>
                            <h2 className="fw-bold mb-0">₹{summaryStats.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Section */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                    <div className="row align-items-center">
                        <div className="col-md-6">
                            <label className="d-block mb-3 fw-medium text-secondary">Upload Meesho Sales Excel</label>
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
                                    Save {parsedData.length} Records
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
                            <h5 className="mb-0 fw-bold">Saved Meesho Sales Records</h5>
                        </div>
                        <div className="col-md-4">
                            <div className="input-group input-group-sm">
                                <span className="input-group-text bg-white border-end-0">
                                    <Search size={16} className="text-secondary" />
                                </span>
                                <input
                                    type="text"
                                    className="form-control border-start-0 ps-0"
                                    placeholder="Search by Sub Order, Supplier..."
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
                                <th>Sub Order / Identifier</th>
                                <th>Supplier Info</th>
                                <th>Financials</th>
                                <th>Order Date</th>
                                <th className="text-end pe-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="border-top-0">
                            {firestoreLoading ? (
                                <tr><td colSpan={6} className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></td></tr>
                            ) : paginatedReports.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-5 text-secondary">No reports found</td></tr>
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
                                            <div className="fw-bold">{report.subOrderNum}</div>
                                            <div className="small text-secondary">{report.identifier}</div>
                                        </td>
                                        <td>
                                            <div className="small fw-medium">{report.supName}</div>
                                            <div className="small text-secondary">GSTIN: {report.gstin}</div>
                                        </td>
                                        <td>
                                            <div className="small">Total: ₹{report.totalInvoiceValue?.toFixed(2)}</div>
                                            <div className="small text-secondary">Taxable: ₹{report.totalTaxableSaleValue?.toFixed(2)}</div>
                                            <div className="small text-secondary">Tax: ₹{report.taxAmount?.toFixed(2)}</div>
                                        </td>
                                        <td>
                                            <div className="small">{report.orderDate}</div>
                                            <div className="small text-secondary">FY: {report.financialYear}</div>
                                        </td>
                                        <td className="text-end pe-4">
                                            <div className="d-flex justify-content-end gap-1">
                                                <button className="btn btn-sm btn-icon btn-light" onClick={() => handleViewReport(report)} title="View"><Eye size={16} className="text-primary" /></button>
                                                <button className="btn btn-sm btn-icon btn-light" onClick={() => handleEditReport(report)} title="Edit"><Edit2 size={16} className="text-success" /></button>
                                                <button className="btn btn-sm btn-icon btn-light" onClick={() => { if (window.confirm("Delete this record?")) remove(report.id!); }} title="Delete"><Trash2 size={16} className="text-danger" /></button>
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

            <MeeshoSalesRepoModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setSelectedReport(null); }}
                report={selectedReport}
                onSave={handleSaveReport}
                mode={modalMode}
            />
        </div>
    );
};

export default MeeshoSalesRepo;
