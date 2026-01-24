import React, { useState, useMemo } from 'react';
import { RefreshCw, Loader, AlertCircle, CheckCircle, TrendingUp, TrendingDown, ShoppingCart, Landmark } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { syncFlipkartOrders } from '../api/flipkartApi';
import type { FlipkartOrder } from '../types';

const FlipkartNet: React.FC = () => {
    const { data: savedOrders, add, loading: firestoreLoading } = useFirestore<FlipkartOrder>('flipkartOrders');
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

    const stats = useMemo(() => {
        if (!savedOrders.length) return null;

        const totals = {
            sales: 0,
            profit: 0,
            loss: 0,
            settlement: 0,
            count: savedOrders.length
        };

        savedOrders.forEach(order => {
            totals.sales += (order.sellerPrice || 0);
            totals.settlement += (order.bankSettlement || 0);
            const pl = order.profitLoss || 0;
            if (pl > 0) totals.profit += pl;
            else if (pl < 0) totals.loss += Math.abs(pl);
        });

        return totals;
    }, [savedOrders]);

    const handleFlipkartSync = async () => {
        setIsSyncing(true);
        setError(null);
        setSyncSuccess(null);

        try {
            const result = await syncFlipkartOrders();
            if (result.success && result.orders.length > 0) {
                const uploadDate = new Date().toISOString();
                let addedCount = 0;

                for (const apiOrder of result.orders) {
                    const exists = savedOrders.find(o => o.orderItemId === apiOrder.orderItemId);
                    if (!exists) {
                        await add({
                            ...apiOrder,
                            uploadDate,
                            channel: apiOrder.channel || 'Flipkart',
                            returnProductStatus: 'Working',
                            sellerPrice: apiOrder.sellerPrice || 0,
                            marketplaceFees: apiOrder.marketplaceFees || 0,
                            gstOnFees: apiOrder.gstOnFees || 0,
                            productCost: apiOrder.productCost || 0,
                            bankSettlement: apiOrder.bankSettlement || 0,
                            inputGstCredit: apiOrder.inputGstCredit || 0,
                            tdsCredit: apiOrder.tdsCredit || 0,
                            refundAmount: apiOrder.refundAmount || 0,
                            totalDiscount: apiOrder.totalDiscount || 0,
                            profitLoss: apiOrder.profitLoss || 0,
                        });
                        addedCount++;
                    }
                }
                setSyncSuccess(`Successfully synced ${addedCount} new orders from Flipkart!`);
            } else {
                setError("No new orders found in the last 7 days.");
            }
        } catch (err: any) {
            console.error("Sync error:", err);
            // Handle Firebase error structure
            const errorMsg = err.message || 'Check connection';
            setError(`Failed to sync with Flipkart: ${errorMsg}`);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="h3 mb-0 fw-bold text-gray-800">Flipkart API Integration (Net)</h2>
                <button
                    className={`btn ${isSyncing ? 'btn-secondary' : 'btn-primary'} d-flex align-items-center gap-2 px-4 py-2 shadow-sm`}
                    onClick={handleFlipkartSync}
                    disabled={isSyncing}
                >
                    {isSyncing ? (
                        <Loader size={18} className="spinner-border spinner-border-sm" />
                    ) : (
                        <RefreshCw size={18} />
                    )}
                    Sync Real-time Data
                </button>
            </div>

            {error && (
                <div className="alert alert-danger d-flex align-items-center mb-4 shadow-sm" role="alert">
                    <AlertCircle size={20} className="me-2" />
                    <div>{error}</div>
                </div>
            )}

            {syncSuccess && (
                <div className="alert alert-success d-flex align-items-center mb-4 shadow-sm" role="alert">
                    <CheckCircle size={20} className="me-2" />
                    <div>{syncSuccess}</div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="row g-4 mb-5">
                <div className="col-md-3">
                    <div className="card shadow-sm border-0 h-100 bg-white">
                        <div className="card-body">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <div className="bg-primary bg-opacity-10 p-2 rounded">
                                    <ShoppingCart size={24} className="text-primary" />
                                </div>
                                <span className="badge bg-light text-dark">{stats?.count || 0} Orders</span>
                            </div>
                            <h6 className="text-secondary text-uppercase small fw-bold mb-1">Total Sales</h6>
                            <h3 className="fw-bold mb-0">₹{stats?.sales.toLocaleString('en-IN') || '0.00'}</h3>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card shadow-sm border-0 h-100 bg-white">
                        <div className="card-body">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <div className="bg-success bg-opacity-10 p-2 rounded">
                                    <TrendingUp size={24} className="text-success" />
                                </div>
                            </div>
                            <h6 className="text-secondary text-uppercase small fw-bold mb-1">Net Profit</h6>
                            <h3 className="fw-bold mb-0 text-success">₹{stats?.profit.toLocaleString('en-IN') || '0.00'}</h3>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card shadow-sm border-0 h-100 bg-white">
                        <div className="card-body">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <div className="bg-danger bg-opacity-10 p-2 rounded">
                                    <TrendingDown size={24} className="text-danger" />
                                </div>
                            </div>
                            <h6 className="text-secondary text-uppercase small fw-bold mb-1">Total Loss</h6>
                            <h3 className="fw-bold mb-0 text-danger">₹{stats?.loss.toLocaleString('en-IN') || '0.00'}</h3>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card shadow-sm border-0 h-100 bg-white">
                        <div className="card-body">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <div className="bg-info bg-opacity-10 p-2 rounded">
                                    <Landmark size={24} className="text-info" />
                                </div>
                            </div>
                            <h6 className="text-secondary text-uppercase small fw-bold mb-1">Settlement Amt</h6>
                            <h3 className="fw-bold mb-0 text-info">₹{stats?.settlement.toLocaleString('en-IN') || '0.00'}</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm overflow-hidden">
                <div className="card-header bg-white py-3">
                    <h5 className="mb-0 fw-bold text-gray-800">Latest Sync Results</h5>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="px-4 py-3 text-secondary text-uppercase small fw-bold">Order ID</th>
                                    <th className="px-4 py-3 text-secondary text-uppercase small fw-bold">SKU</th>
                                    <th className="px-4 py-3 text-secondary text-uppercase small fw-bold">Status</th>
                                    <th className="px-4 py-3 text-secondary text-uppercase small fw-bold text-end">Price</th>
                                    <th className="px-4 py-3 text-secondary text-uppercase small fw-bold text-end">P/L</th>
                                </tr>
                            </thead>
                            <tbody>
                                {firestoreLoading ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-5">
                                            <Loader size={32} className="spinner-border text-primary" />
                                            <p className="mt-2 text-secondary">Loading...</p>
                                        </td>
                                    </tr>
                                ) : savedOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-5 text-secondary">
                                            No data found. Click "Sync" to fetch orders from Flipkart.
                                        </td>
                                    </tr>
                                ) : (
                                    savedOrders.slice(0, 10).map((order) => (
                                        <tr key={order.id}>
                                            <td className="px-4 py-3 fw-medium">{order.orderId}</td>
                                            <td className="px-4 py-3">{order.sku}</td>
                                            <td className="px-4 py-3">
                                                <span className={`badge ${order.deliveryStatus === 'Sale' ? 'bg-success' :
                                                    order.deliveryStatus === 'Cancellation' ? 'bg-danger' : 'bg-warning'
                                                    }`}>
                                                    {order.deliveryStatus}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-end fw-bold">₹{order.sellerPrice?.toFixed(2)}</td>
                                            <td className={`px-4 py-3 text-end fw-bold ${(order.profitLoss || 0) >= 0 ? 'text-success' : 'text-danger'
                                                }`}>
                                                ₹{order.profitLoss?.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="card-footer bg-white border-0 py-3 text-center">
                    <p className="small text-muted mb-0">API currently fetches the last 7 days of orders automatically.</p>
                </div>
            </div>
        </div>
    );
};

export default FlipkartNet;
