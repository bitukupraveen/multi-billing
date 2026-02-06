import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileText } from 'lucide-react';
import type { FlipkartOrder, FlipkartGSTReportRecord } from '../types';

interface FlipkartReconciliationModalProps {
    isOpen: boolean;
    onClose: () => void;
    orders: FlipkartOrder[];
    gstReports: FlipkartGSTReportRecord[];
}

const FlipkartReconciliationModal: React.FC<FlipkartReconciliationModalProps> = ({
    isOpen,
    onClose,
    orders,
    gstReports
}) => {
    const [activeTab, setActiveTab] = useState<'missingInGst' | 'missingInOrders'>('missingInGst');

    const analysis = useMemo(() => {
        // Create lookup sets for fast access
        const gstItemIds = new Set(gstReports.map(g => g.orderItemId).filter(Boolean));
        const gstOrderIds = new Set(gstReports.map(g => g.orderId).filter(Boolean));

        const orderItemIds = new Set(orders.map(o => o.orderItemId).filter(Boolean));
        const orderOrderIds = new Set(orders.map(o => o.orderId).filter(Boolean));

        // Find Orders present in Order Report but missing in GST Report
        const missingInGst = orders.filter(order => {
            const hasItemIdMatch = order.orderItemId && gstItemIds.has(order.orderItemId);
            const hasOrderIdMatch = order.orderId && gstOrderIds.has(order.orderId);
            return !hasItemIdMatch && !hasOrderIdMatch;
        });

        // Find GST Records present in GST Report but missing in Order Report
        const missingInOrders = gstReports.filter(gst => {
            const hasItemIdMatch = gst.orderItemId && orderItemIds.has(gst.orderItemId);
            const hasOrderIdMatch = gst.orderId && orderOrderIds.has(gst.orderId);
            return !hasItemIdMatch && !hasOrderIdMatch;
        });

        return { missingInGst, missingInOrders };
    }, [orders, gstReports]);

    const handleExport = (data: any[], filename: string) => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "ReconciliationData");
        XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    if (!isOpen) return null;

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content shadow-lg border-0">
                    <div className="modal-header bg-primary text-white">
                        <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                            <FileText size={20} />
                            Reconciliation Report
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>
                    <div className="modal-body p-0">
                        {/* Summary Cards */}
                        <div className="row g-0 border-bottom">
                            <div className="col-md-6 border-end">
                                <button
                                    className={`btn p-4 w-100 text-start rounded-0 ${activeTab === 'missingInGst' ? 'bg-primary bg-opacity-10 border-bottom border-primary border-3' : 'bg-white'}`}
                                    onClick={() => setActiveTab('missingInGst')}
                                >
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 className="text-secondary text-uppercase small fw-bold mb-1">Missing in GST Report</h6>
                                            <div className="small text-muted">Orders found here but not in GST</div>
                                        </div>
                                        <div className="fs-2 fw-bold text-danger">{analysis.missingInGst.length}</div>
                                    </div>
                                </button>
                            </div>
                            <div className="col-md-6">
                                <button
                                    className={`btn p-4 w-100 text-start rounded-0 ${activeTab === 'missingInOrders' ? 'bg-primary bg-opacity-10 border-bottom border-primary border-3' : 'bg-white'}`}
                                    onClick={() => setActiveTab('missingInOrders')}
                                >
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 className="text-secondary text-uppercase small fw-bold mb-1">Missing in Order Report</h6>
                                            <div className="small text-muted">GST records found here but not in Orders</div>
                                        </div>
                                        <div className="fs-2 fw-bold text-warning">{analysis.missingInOrders.length}</div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="p-3">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h6 className="fw-bold mb-0 text-primary">
                                    {activeTab === 'missingInGst'
                                        ? `Orders Unique to Order Report (${analysis.missingInGst.length})`
                                        : `Records Unique to GST Report (${analysis.missingInOrders.length})`}
                                </h6>
                                <button
                                    className="btn btn-sm btn-success d-flex align-items-center gap-2"
                                    onClick={() => handleExport(
                                        activeTab === 'missingInGst' ? analysis.missingInGst : analysis.missingInOrders,
                                        activeTab === 'missingInGst' ? 'Missing_In_GST' : 'Missing_In_Orders'
                                    )}
                                    disabled={activeTab === 'missingInGst' ? analysis.missingInGst.length === 0 : analysis.missingInOrders.length === 0}
                                >
                                    <Download size={16} /> Export List
                                </button>
                            </div>

                            <div className="table-responsive bg-white border rounded" style={{ maxHeight: '500px' }}>
                                <table className="table table-hover mb-0 small">
                                    <thead className="bg-light sticky-top z-1">
                                        <tr>
                                            <th>#</th>
                                            {activeTab === 'missingInGst' ? (
                                                <>
                                                    <th>Order ID</th>
                                                    <th>Order Item ID</th>
                                                    <th>Date</th>
                                                    <th>SKU</th>
                                                    <th className="text-end">Sale Amt</th>
                                                    <th className="text-end">Settlement</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th>Order ID</th>
                                                    <th>Order Item ID</th>
                                                    <th>Date</th>
                                                    <th>SKU</th>
                                                    <th className="text-end">Inv Amt</th>
                                                    <th className="text-end">Taxable</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeTab === 'missingInGst' ? (
                                            analysis.missingInGst.length > 0 ? (
                                                analysis.missingInGst.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td>{idx + 1}</td>
                                                        <td>{item.orderId}</td>
                                                        <td>{item.orderItemId}</td>
                                                        <td>{item.orderDate || item.paymentDate}</td>
                                                        <td>{item.sellerSku}</td>
                                                        <td className="text-end">{item.saleAmount}</td>
                                                        <td className="text-end">{item.bankSettlementValue}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr><td colSpan={7} className="text-center py-5 text-muted">No discrepancies found! all orders have matching GST records.</td></tr>
                                            )
                                        ) : (
                                            analysis.missingInOrders.length > 0 ? (
                                                analysis.missingInOrders.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td>{idx + 1}</td>
                                                        <td>{item.orderId}</td>
                                                        <td>{item.orderItemId}</td>
                                                        <td>{item.orderDate}</td>
                                                        <td>{item.sku}</td>
                                                        <td className="text-end">{item.finalInvoiceAmount}</td>
                                                        <td className="text-end">{item.taxableValue}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr><td colSpan={7} className="text-center py-5 text-muted">No discrepancies found! All GST records have matching orders.</td></tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer bg-light">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FlipkartReconciliationModal;
