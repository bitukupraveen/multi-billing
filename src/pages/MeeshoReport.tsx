import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Plus, Download, Eye, Edit2, Trash2, ChevronLeft, ChevronRight, Loader, FileSpreadsheet } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import type { MeeshoOrder } from '../types';
import MeeshoOrderModal from '../components/MeeshoOrderModal';

const MeeshoReport: React.FC = () => {
    const { data: savedOrders, add, update, remove, loading: firestoreLoading } = useFirestore<MeeshoOrder>('meeshoOrders');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<MeeshoOrder | null>(null);
    const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');

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
        XLSX.writeFile(wb, `Meesho_Orders_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Pagination calculations
    const totalPages = Math.ceil(savedOrders.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedOrders = savedOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
                        Export
                    </button>
                </div>
            </div>

            <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3 border-0">
                    <h5 className="mb-0 fw-bold">Saved Orders ({firestoreLoading ? '...' : savedOrders.length})</h5>
                </div>
                <div className="card-body p-0">
                    {firestoreLoading ? (
                        <div className="text-center py-5">
                            <Loader size={32} className="spinner-border text-primary" />
                            <p className="mt-3 text-secondary">Loading orders...</p>
                        </div>
                    ) : savedOrders.length === 0 ? (
                        <div className="text-center py-5 text-secondary">
                            <FileSpreadsheet size={48} className="mb-3 opacity-50" />
                            <p>No orders found. Click "Add New Order" to create one.</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0 small text-nowrap">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="px-3 py-3 text-secondary text-uppercase small fw-bold">Order ID</th>
                                        <th className="px-3 py-3 text-secondary text-uppercase small fw-bold">Sub Order ID</th>
                                        <th className="px-3 py-3 text-secondary text-uppercase small fw-bold">SKU</th>
                                        <th className="px-3 py-3 text-secondary text-uppercase small fw-bold">Qty</th>
                                        <th className="px-3 py-3 text-secondary text-uppercase small fw-bold">Contribution</th>
                                        <th className="px-3 py-3 text-secondary text-uppercase small fw-bold text-end">Settlement</th>
                                        <th className="px-3 py-3 text-secondary text-uppercase small fw-bold text-end">GST</th>
                                        <th className="px-3 py-3 text-secondary text-uppercase small fw-bold text-end">Profit/Loss</th>
                                        <th className="px-3 py-3 text-secondary text-uppercase small fw-bold text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedOrders.map((order) => (
                                        <tr key={order.id}>
                                            <td className="px-3 py-3">{order.orderId}</td>
                                            <td className="px-3 py-3">{order.subOrderId}</td>
                                            <td className="px-3 py-3">{order.productDetails.skuCode}</td>
                                            <td className="px-3 py-3">{order.productDetails.quantity}</td>
                                            <td className="px-3 py-3">
                                                <span className={`badge ${order.subOrderContribution === 'Delivered' ? 'bg-success' :
                                                    order.subOrderContribution === 'RTO' ? 'bg-warning' : 'bg-danger'
                                                    }`}>
                                                    {order.subOrderContribution}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-end fw-bold">₹{order.summary.bankSettlement.toFixed(2)}</td>
                                            <td className="px-3 py-3 text-end fw-medium text-primary">₹{(order.summary.gst || 0).toFixed(2)}</td>
                                            <td className="px-3 py-3 text-end fw-bold">
                                                <span className={order.summary.profitLoss >= 0 ? 'text-success' : 'text-danger'}>
                                                    ₹{order.summary.profitLoss.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <div className="d-flex gap-1 justify-content-center">
                                                    <button className="btn btn-sm btn-outline-primary p-1" onClick={() => handleView(order)} title="View">
                                                        <Eye size={14} />
                                                    </button>
                                                    <button className="btn btn-sm btn-outline-success p-1" onClick={() => handleEdit(order)} title="Edit">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button className="btn btn-sm btn-outline-danger p-1" onClick={() => handleDelete(order)} title="Delete">
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
                    <div className="card-footer bg-white border-0 py-3 d-flex justify-content-between align-items-center border-top">
                        <div className="text-secondary small">
                            Showing <span className="fw-bold">{startIndex + 1}</span> to <span className="fw-bold">{Math.min(startIndex + ITEMS_PER_PAGE, savedOrders.length)}</span> of <span className="fw-bold">{savedOrders.length}</span> orders
                        </div>
                        <nav>
                            <ul className="pagination pagination-sm mb-0 gap-1">
                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link rounded border-0" onClick={() => handlePageChange(currentPage - 1)}>
                                        <ChevronLeft size={16} />
                                    </button>
                                </li>
                                {[...Array(totalPages)].map((_, i) => (
                                    <li key={i + 1} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                                        <button className={`page-link rounded border-0 ${currentPage === i + 1 ? 'bg-primary text-white' : ''}`} onClick={() => handlePageChange(i + 1)}>
                                            {i + 1}
                                        </button>
                                    </li>
                                ))}
                                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                    <button className="page-link rounded border-0" onClick={() => handlePageChange(currentPage + 1)}>
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
