import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Upload, AlertCircle, Save, CheckCircle, Loader, Eye, Edit2, Trash2, Download, ChevronLeft, ChevronRight, Search, TrendingUp, Package, Clock } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import type { MeeshoLiveOrder } from '../types';
import MeeshoLiveOrderModal from '../components/MeeshoLiveOrderModal';

const MeeshoLiveOrders: React.FC = () => {
    const { data: savedOrders, add, update, remove, loading: firestoreLoading } = useFirestore<MeeshoLiveOrder>('meeshoLiveOrders');
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
    const [selectedOrder, setSelectedOrder] = useState<MeeshoLiveOrder | null>(null);
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
                const existingSubOrders = new Set(savedOrders.map(o => o.subOrderId));

                let dupes = 0;
                let news = 0;

                data.forEach((row: any) => {
                    const getVal = (keys: string[]) => {
                        const foundKey = Object.keys(row).find(k =>
                            keys.some(key => {
                                const normalizedKey = k.toLowerCase().replace(/[\s\(\)/₹\-\.]/g, '');
                                const normalizedSearch = key.toLowerCase().replace(/[\s\(\)/₹\-\.]/g, '');
                                return normalizedKey.includes(normalizedSearch);
                            })
                        );
                        return foundKey ? row[foundKey] : null;
                    };

                    const subOrderId = getVal(['Sub-order ID', 'SubOrderNo', 'Sub Order No'])?.toString() || '';

                    if (subOrderId && existingSubOrders.has(subOrderId)) {
                        dupes++;
                    } else if (subOrderId) {
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
            const existingSubOrders = new Set(savedOrders.map(o => o.subOrderId));

            for (const row of parsedData) {
                const getVal = (keys: string[]) => {
                    const foundKey = Object.keys(row).find(k =>
                        keys.some(key => {
                            const normalizedKey = k.toLowerCase().replace(/[\s\(\)/₹\-\.]/g, '');
                            const normalizedSearch = key.toLowerCase().replace(/[\s\(\)/₹\-\.]/g, '');
                            return normalizedKey.includes(normalizedSearch);
                        })
                    );
                    return foundKey ? row[foundKey] : null;
                };

                const subOrderId = getVal(['Sub-order ID', 'SubOrderNo', 'Sub Order No'])?.toString() || '';

                if (!subOrderId) continue;
                if (skipDuplicates && existingSubOrders.has(subOrderId)) continue;

                const order: Omit<MeeshoLiveOrder, 'id'> = {
                    orderId: getVal(['Order ID'])?.toString() || '',
                    subOrderId: subOrderId,
                    meeshoId: getVal(['Meesho ID'])?.toString() || '',
                    productTitle: getVal(['Product Title', 'Product Name'])?.toString() || '',
                    skuId: getVal(['SKU ID', 'Supplier SKU'])?.toString() || '',
                    quantity: Number(getVal(['Quantity'])) || 1,
                    dispatchDate: getVal(['Dispatch Date/SLA', 'Dispatch Date'])?.toString() || '',
                    uploadDate,
                    rawData: row
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
        setSelectedOrder(null);
        setModalMode('edit');
        setModalOpen(true);
    };

    const handleView = (order: MeeshoLiveOrder) => {
        setSelectedOrder(order);
        setModalMode('view');
        setModalOpen(true);
    };

    const handleEdit = (order: MeeshoLiveOrder) => {
        setSelectedOrder(order);
        setModalMode('edit');
        setModalOpen(true);
    };

    const handleDelete = async (order: MeeshoLiveOrder) => {
        if (!order.id) return;
        if (window.confirm(`Are you sure you want to delete live order ${order.subOrderId}?`)) {
            await remove(order.id);
        }
    };

    const handleSaveOrder = async (orderData: MeeshoLiveOrder) => {
        try {
            const { id, ...data } = orderData;
            if (id) {
                await update(id, data as any);
            } else {
                await add(data as any);
            }
            setModalOpen(false);
            setSelectedOrder(null);
        } catch (err) {
            console.error("Error saving live order:", err);
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
        const exportData = savedOrders.map(({ id, rawData, ...order }) => order);
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Meesho Live Orders");
        XLSX.writeFile(wb, `Meesho_Live_Orders_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const filteredOrders = useMemo(() => {
        if (!searchTerm) return savedOrders;
        const lowSearch = searchTerm.toLowerCase();
        return savedOrders.filter(order =>
            (order.subOrderId || '').toLowerCase().includes(lowSearch) ||
            (order.orderId || '').toLowerCase().includes(lowSearch) ||
            (order.skuId || '').toLowerCase().includes(lowSearch) ||
            (order.productTitle || '').toLowerCase().includes(lowSearch)
        );
    }, [savedOrders, searchTerm]);

    const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const metrics = useMemo(() => {
        return {
            totalOrders: filteredOrders.length,
            totalQuantity: filteredOrders.reduce((sum, o) => sum + (o.quantity || 0), 0),
            uniqueProducts: new Set(filteredOrders.map(o => o.skuId)).size
        };
    }, [filteredOrders]);

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="h3 mb-1 fw-bold text-gray-800">Meesho Live Orders</h2>
                    <p className="text-secondary small mb-0">Manage and track your active orders from Meesho</p>
                </div>
                <div className="d-flex gap-2">
                    <button className="btn btn-warning d-flex align-items-center gap-2 shadow-sm rounded-pill px-3" onClick={handleAdd}>
                        Add New Order
                    </button>
                    <button
                        className="btn btn-outline-primary d-flex align-items-center gap-2 shadow-sm rounded-pill px-3"
                        onClick={handleExportExcel}
                        disabled={savedOrders.length === 0}
                    >
                        <Download size={18} />
                        Export
                    </button>
                    {selectedIds.size > 0 && (
                        <button className="btn btn-danger d-flex align-items-center gap-2 shadow-sm rounded-pill px-3" onClick={handleBulkDelete}>
                            <Trash2 size={18} />
                            Delete ({selectedIds.size})
                        </button>
                    )}
                </div>
            </div>

            {/* Metrics */}
            <div className="row g-4 mb-4">
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm bg-primary text-white overflow-hidden ripple-card">
                        <div className="card-body p-4 position-relative">
                            <TrendingUp className="position-absolute opacity-25" style={{ right: '10px', bottom: '10px' }} size={64} />
                            <h6 className="text-uppercase small fw-bold opacity-75 mb-2">Total Live Orders</h6>
                            <h2 className="fw-bold mb-0">{metrics.totalOrders}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm bg-success text-white overflow-hidden ripple-card">
                        <div className="card-body p-4 position-relative">
                            <Package className="position-absolute opacity-25" style={{ right: '10px', bottom: '10px' }} size={64} />
                            <h6 className="text-uppercase small fw-bold opacity-75 mb-2">Total Units</h6>
                            <h2 className="fw-bold mb-0">{metrics.totalQuantity}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm bg-info text-white overflow-hidden ripple-card">
                        <div className="card-body p-4 position-relative">
                            <Clock className="position-absolute opacity-25" style={{ right: '10px', bottom: '10px' }} size={64} />
                            <h6 className="text-uppercase small fw-bold opacity-75 mb-2">Unique SKUs</h6>
                            <h2 className="fw-bold mb-0">{metrics.uniqueProducts}</h2>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Section */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '1rem' }}>
                <div className="card-body p-4">
                    <div className="row align-items-center">
                        <div className="col-md-6">
                            <label className="d-block mb-3 fw-bold text-dark h6">Upload Live Orders Excel</label>
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0">
                                    <Upload size={18} className="text-primary" />
                                </span>
                                <input
                                    type="file"
                                    className="form-control border-start-0 shadow-none ps-0"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileUpload}
                                />
                            </div>
                        </div>
                        {parsedData.length > 0 && (
                            <div className="col-md-6 mt-3 mt-md-0 d-flex flex-column gap-2">
                                <div className="d-flex align-items-center gap-3 mb-1 bg-light p-3 rounded-4">
                                    <div className="form-check form-switch mb-0">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="skipDuplicates"
                                            checked={skipDuplicates}
                                            onChange={(e) => setSkipDuplicates(e.target.checked)}
                                        />
                                        <label className="form-check-label small fw-bold" htmlFor="skipDuplicates">
                                            Skip Duplicates
                                        </label>
                                    </div>
                                    <div className="small text-secondary fw-medium">
                                        <span className="text-success">{newRecordsCount} New</span> |
                                        <span className="text-warning ms-1">{duplicateCount} Existing</span>
                                    </div>
                                </div>
                                <div className="d-flex gap-2">
                                    <button
                                        className="btn btn-primary flex-grow-1 d-flex align-items-center justify-content-center gap-2 py-2 shadow-sm rounded-pill fw-bold"
                                        onClick={handleSaveToFirebase}
                                        disabled={saving || (skipDuplicates && newRecordsCount === 0)}
                                    >
                                        {saving ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
                                        Save {skipDuplicates ? newRecordsCount : parsedData.length} Records
                                    </button>
                                    <button className="btn btn-outline-secondary py-2 rounded-pill px-4" onClick={() => setParsedData([])}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    {error && <div className="alert alert-danger mt-3 mb-0 rounded-4 border-0 shadow-sm small fw-medium d-flex align-items-center gap-2"><AlertCircle size={18} />{error}</div>}
                    {saveSuccess && <div className="alert alert-success mt-3 mb-0 rounded-4 border-0 shadow-sm small fw-medium d-flex align-items-center gap-2"><CheckCircle size={18} />Orders imported successfully!</div>}
                </div>
            </div>

            {/* Data Table */}
            <div className="card border-0 shadow-sm overflow-hidden" style={{ borderRadius: '1rem' }}>
                <div className="card-header bg-white py-3 border-0">
                    <div className="row align-items-center">
                        <div className="col">
                            <h5 className="mb-0 fw-bold">Live Order Dashboard</h5>
                        </div>
                        <div className="col-md-4">
                            <div className="input-group input-group-sm rounded-pill bg-light border-0 px-2">
                                <span className="input-group-text bg-transparent border-0 pe-1">
                                    <Search size={16} className="text-secondary" />
                                </span>
                                <input
                                    type="text"
                                    className="form-control bg-transparent border-0 shadow-none ps-0"
                                    placeholder="Search by ID, SKU, Product..."
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
                                <th>Order IDs</th>
                                <th>Product Details</th>
                                <th>SKU ID</th>
                                <th className="text-center">Qty</th>
                                <th>Dispatch SLA</th>
                                <th className="text-center pe-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="border-top-0">
                            {firestoreLoading ? (
                                <tr><td colSpan={7} className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></td></tr>
                            ) : paginatedOrders.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-5 text-secondary">No live orders found</td></tr>
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
                                            <div className="fw-bold text-primary">{order.subOrderId}</div>
                                            <div className="small text-secondary">ID: {order.orderId}</div>
                                        </td>
                                        <td>
                                            <div className="fw-medium text-truncate" style={{ maxWidth: '250px' }} title={order.productTitle}>{order.productTitle}</div>
                                            <div className="small text-secondary">Meesho ID: {order.meeshoId}</div>
                                        </td>
                                        <td><code className="text-dark bg-light px-2 py-1 rounded small">{order.skuId}</code></td>
                                        <td className="text-center"><span className="badge bg-light text-dark border fw-bold">{order.quantity}</span></td>
                                        <td>
                                            <div className="d-flex align-items-center gap-1 text-danger fw-medium">
                                                <Clock size={14} />
                                                {order.dispatchDate}
                                            </div>
                                        </td>
                                        <td className="text-center pe-4">
                                            <div className="d-flex justify-content-center gap-1">
                                                <button className="btn btn-sm btn-icon btn-light rounded-circle" onClick={() => handleView(order)}><Eye size={16} className="text-primary" /></button>
                                                <button className="btn btn-sm btn-icon btn-light rounded-circle" onClick={() => handleEdit(order)}><Edit2 size={16} className="text-success" /></button>
                                                <button className="btn btn-sm btn-icon btn-light rounded-circle" onClick={() => handleDelete(order)}><Trash2 size={16} className="text-danger" /></button>
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
                        <div className="text-secondary small fw-medium">
                            Showing <span className="text-dark fw-bold">{startIndex + 1}</span> to <span className="text-dark fw-bold">{Math.min(startIndex + ITEMS_PER_PAGE, filteredOrders.length)}</span> of <span className="text-dark fw-bold">{filteredOrders.length}</span> live orders
                        </div>
                        <nav>
                            <ul className="pagination pagination-sm mb-0 gap-1">
                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link rounded-circle border-0" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}><ChevronLeft size={16} /></button>
                                </li>
                                {[...Array(totalPages)].map((_, i) => {
                                    const pageNum = i + 1;
                                    if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                                        return (
                                            <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                                                <button
                                                    className={`page-link rounded-circle border-0 ${currentPage === pageNum ? 'bg-primary text-white shadow-sm' : ''}`}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                >
                                                    {pageNum}
                                                </button>
                                            </li>
                                        );
                                    } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                        return <li key={pageNum} className="page-item disabled"><span className="page-link border-0">...</span></li>;
                                    }
                                    return null;
                                })}
                                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                    <button className="page-link rounded-circle border-0" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}><ChevronRight size={16} /></button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                )}
            </div>

            {/* Modal */}
            {modalOpen && (
                <MeeshoLiveOrderModal
                    isOpen={modalOpen}
                    onClose={() => { setModalOpen(false); setSelectedOrder(null); }}
                    order={selectedOrder}
                    onSave={handleSaveOrder}
                    mode={modalMode}
                />
            )}
            <style>{`
                .btn-icon { width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; }
                .ripple-card { transition: transform 0.2s; cursor: default; }
                .ripple-card:hover { transform: translateY(-3px); }
            `}</style>
        </div>
    );
};

export default MeeshoLiveOrders;
