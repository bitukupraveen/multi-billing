import React, { useMemo } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { ShoppingCart, TrendingUp, TrendingDown, Landmark, Package, History } from 'lucide-react';
import type { FlipkartOrder, MeeshoOrder } from '../types';

const Dashboard: React.FC = () => {
    const { data: flipkartOrders, loading: flipkartLoading } = useFirestore<FlipkartOrder>('flipkartOrders');
    const { data: meeshoOrders, loading: meeshoLoading } = useFirestore<MeeshoOrder>('meeshoOrders');

    const loading = flipkartLoading || meeshoLoading;

    const stats = useMemo(() => {
        if (!flipkartOrders.length && !meeshoOrders.length) return null;

        const initStats = () => ({ sales: 0, profit: 0, loss: 0, settlement: 0, count: 0, deliveredCount: 0, rtoCount: 0, returnCount: 0 });

        const overall = initStats();
        const flipkart = initStats();
        const meesho = initStats();

        // Process Flipkart
        flipkartOrders.forEach(order => {
            const s = (order.sellerPrice || 0);
            const set = (order.bankSettlement || 0);
            const pl = order.profitLoss || 0;

            flipkart.sales += s;
            flipkart.settlement += set;
            flipkart.count += 1;
            if (pl > 0) flipkart.profit += pl;
            else if (pl < 0) flipkart.loss += Math.abs(pl);

            // Status counts for Flipkart
            if (order.deliveryStatus === 'Sale') {
                flipkart.deliveredCount += 1;
                overall.deliveredCount += 1;
            } else if (order.deliveryStatus === 'LogisticsReturn') {
                flipkart.rtoCount += 1;
                overall.rtoCount += 1;
            } else if (order.deliveryStatus === 'CustomerReturn') {
                flipkart.returnCount += 1;
                overall.returnCount += 1;
            }

            overall.sales += s;
            overall.settlement += set;
            overall.count += 1;
            if (pl > 0) overall.profit += pl;
            else if (pl < 0) overall.loss += Math.abs(pl);
        });

        // Process Meesho
        meeshoOrders.forEach(order => {
            const s = (order.revenue.saleRevenue || 0);
            const set = (order.summary.bankSettlement || 0);
            const pl = order.summary.profitLoss || 0;

            meesho.sales += s;
            meesho.settlement += set;
            meesho.count += 1;
            if (pl > 0) meesho.profit += pl;
            else if (pl < 0) meesho.loss += Math.abs(pl);

            // Status counts for Meesho
            if (order.subOrderContribution === 'Delivered') {
                meesho.deliveredCount += 1;
                overall.deliveredCount += 1;
            } else if (order.subOrderContribution === 'RTO') {
                meesho.rtoCount += 1;
                overall.rtoCount += 1;
            } else if (order.subOrderContribution === 'Return') {
                meesho.returnCount += 1;
                overall.returnCount += 1;
            }

            overall.sales += s;
            overall.settlement += set;
            overall.count += 1;
            if (pl > 0) overall.profit += pl;
            else if (pl < 0) overall.loss += Math.abs(pl);
        });

        // SKU Performance Aggregation
        const skuMap: Record<string, { quantity: number; sales: number }> = {};

        flipkartOrders.forEach(order => {
            if (!order.sku) return;
            if (!skuMap[order.sku]) {
                skuMap[order.sku] = { quantity: 0, sales: 0 };
            }
            skuMap[order.sku].quantity += (order.quantity || 0);
            skuMap[order.sku].sales += (order.sellerPrice || 0);
        });

        meeshoOrders.forEach(order => {
            const sku = order.productDetails.skuCode;
            if (!sku) return;
            if (!skuMap[sku]) {
                skuMap[sku] = { quantity: 0, sales: 0 };
            }
            skuMap[sku].quantity += (order.productDetails.quantity || 0);
            skuMap[sku].sales += (order.revenue.saleRevenue || 0);
        });

        const skuPerformance = Object.entries(skuMap)
            .map(([sku, data]) => ({ sku, ...data }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 10);

        // Recent Records
        const recentFlipkart = flipkartOrders.map(o => ({
            id: o.id,
            channel: 'Flipkart',
            orderId: o.orderId,
            sku: o.sku,
            amount: o.bankSettlement,
            date: o.uploadDate,
            profitLoss: o.profitLoss
        }));

        const recentMeesho = meeshoOrders.map(o => ({
            id: o.id,
            channel: 'Meesho',
            orderId: o.orderId,
            sku: o.productDetails.skuCode,
            amount: o.summary.bankSettlement,
            date: o.uploadDate,
            profitLoss: o.summary.profitLoss
        }));

        const recentRecords = [...recentFlipkart, ...recentMeesho]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 8);

        return {
            overall,
            flipkart,
            meesho,
            skuPerformance,
            recentRecords
        };
    }, [flipkartOrders, meeshoOrders]);

    return (
        <div className="container-fluid py-4">
            <h1 className="h3 mb-4 fw-bold text-gray-800">Dashboard Overview - All Reports</h1>

            {/* Overall Cards */}
            <div className="row g-4 mb-4">
                <div className="col-md-3">
                    <div className="card shadow-sm border-0 h-100 bg-primary text-white">
                        <div className="card-body text-center">
                            <ShoppingCart size={24} className="mb-2 opacity-75" />
                            <h6 className="card-subtitle fw-bold text-uppercase small opacity-75 mb-1">Total Sales</h6>
                            <p className="card-text h3 fw-bold mb-0">₹{stats?.overall.sales.toLocaleString('en-IN') || '0.00'}</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card shadow-sm border-0 h-100 bg-success text-white">
                        <div className="card-body text-center">
                            <TrendingUp size={24} className="mb-2 opacity-75" />
                            <h6 className="card-subtitle fw-bold text-uppercase small opacity-75 mb-1">Net Profit</h6>
                            <p className="card-text h3 fw-bold mb-0">₹{stats?.overall.profit.toLocaleString('en-IN') || '0.00'}</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card shadow-sm border-0 h-100 bg-danger text-white">
                        <div className="card-body text-center">
                            <TrendingDown size={24} className="mb-2 opacity-75" />
                            <h6 className="card-subtitle fw-bold text-uppercase small opacity-75 mb-1">Total Loss</h6>
                            <p className="card-text h3 fw-bold mb-0">₹{stats?.overall.loss.toLocaleString('en-IN') || '0.00'}</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card shadow-sm border-0 h-100 bg-info text-white">
                        <div className="card-body text-center">
                            <Landmark size={24} className="mb-2 opacity-75" />
                            <h6 className="card-subtitle fw-bold text-uppercase small opacity-75 mb-1">Settlement</h6>
                            <p className="card-text h3 fw-bold mb-0">₹{stats?.overall.settlement.toLocaleString('en-IN') || '0.00'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Percentages Cards */}
            <div className="row g-4 mb-4">
                <div className="col-md-4">
                    <div className="card shadow-sm border-0 border-start border-success border-4 h-100">
                        <div className="card-body py-3">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <h6 className="card-subtitle fw-bold text-uppercase small text-muted mb-0">Delivered Rate</h6>
                                <span className="badge bg-success-soft text-success">
                                    {stats?.overall.deliveredCount || 0} Orders
                                </span>
                            </div>
                            <div className="d-flex align-items-baseline gap-2">
                                <p className="card-text h4 fw-bold mb-0">
                                    {((stats?.overall.deliveredCount || 0) / (stats?.overall.count || 1) * 100).toFixed(1)}%
                                </p>
                                <small className="text-muted">of total</small>
                            </div>
                            <div className="progress mt-2" style={{ height: '4px' }}>
                                <div className="progress-bar bg-success" role="progressbar" style={{ width: `${((stats?.overall.deliveredCount || 0) / (stats?.overall.count || 1) * 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card shadow-sm border-0 border-start border-warning border-4 h-100">
                        <div className="card-body py-3">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <h6 className="card-subtitle fw-bold text-uppercase small text-muted mb-0">RTO Rate</h6>
                                <span className="badge bg-warning-soft text-warning">
                                    {stats?.overall.rtoCount || 0} Orders
                                </span>
                            </div>
                            <div className="d-flex align-items-baseline gap-2">
                                <p className="card-text h4 fw-bold mb-0">
                                    {((stats?.overall.rtoCount || 0) / (stats?.overall.count || 1) * 100).toFixed(1)}%
                                </p>
                                <small className="text-muted">of total</small>
                            </div>
                            <div className="progress mt-2" style={{ height: '4px' }}>
                                <div className="progress-bar bg-warning" role="progressbar" style={{ width: `${((stats?.overall.rtoCount || 0) / (stats?.overall.count || 1) * 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card shadow-sm border-0 border-start border-info border-4 h-100">
                        <div className="card-body py-3">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <h6 className="card-subtitle fw-bold text-uppercase small text-muted mb-0">Return Rate</h6>
                                <span className="badge bg-info-soft text-info">
                                    {stats?.overall.returnCount || 0} Orders
                                </span>
                            </div>
                            <div className="d-flex align-items-baseline gap-2">
                                <p className="card-text h4 fw-bold mb-0">
                                    {((stats?.overall.returnCount || 0) / (stats?.overall.count || 1) * 100).toFixed(1)}%
                                </p>
                                <small className="text-muted">of total</small>
                            </div>
                            <div className="progress mt-2" style={{ height: '4px' }}>
                                <div className="progress-bar bg-info" role="progressbar" style={{ width: `${((stats?.overall.returnCount || 0) / (stats?.overall.count || 1) * 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Channel-wise Performance */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-white border-0 py-3">
                            <h5 className="mb-0 fw-bold">Channel-wise breakdown</h5>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="px-4 py-3 text-secondary text-uppercase small fw-bold">Channel</th>
                                            <th className="px-4 py-3 text-secondary text-uppercase small fw-bold text-center">Orders</th>
                                            <th className="px-4 py-3 text-secondary text-uppercase small fw-bold text-center">Delivered</th>
                                            <th className="px-4 py-3 text-secondary text-uppercase small fw-bold text-center">RTO</th>
                                            <th className="px-4 py-3 text-secondary text-uppercase small fw-bold text-center">Return</th>
                                            <th className="px-4 py-3 text-secondary text-uppercase small fw-bold text-end">Sales</th>
                                            <th className="px-4 py-3 text-secondary text-uppercase small fw-bold text-end">Profit</th>
                                            <th className="px-4 py-3 text-secondary text-uppercase small fw-bold text-end">Loss</th>
                                            <th className="px-4 py-3 text-secondary text-uppercase small fw-bold text-end">Settlement</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Flipkart Row */}
                                        <tr>
                                            <td className="px-4 py-3">
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="bg-primary rounded-circle" style={{ width: '12px', height: '12px' }}></div>
                                                    <span className="fw-bold">Flipkart</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">{stats?.flipkart.count || 0}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="text-success fw-medium">{stats?.flipkart.deliveredCount || 0}</span>
                                                <div className="small text-muted">({((stats?.flipkart.deliveredCount || 0) / (stats?.flipkart.count || 1) * 100).toFixed(0)}%)</div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="text-warning fw-medium">{stats?.flipkart.rtoCount || 0}</span>
                                                <div className="small text-muted">({((stats?.flipkart.rtoCount || 0) / (stats?.flipkart.count || 1) * 100).toFixed(0)}%)</div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="text-info fw-medium">{stats?.flipkart.returnCount || 0}</span>
                                                <div className="small text-muted">({((stats?.flipkart.returnCount || 0) / (stats?.flipkart.count || 1) * 100).toFixed(0)}%)</div>
                                            </td>
                                            <td className="px-4 py-3 text-end fw-medium">₹{stats?.flipkart.sales.toLocaleString('en-IN') || '0.00'}</td>
                                            <td className="px-4 py-3 text-end text-success fw-medium">₹{stats?.flipkart.profit.toLocaleString('en-IN') || '0.00'}</td>
                                            <td className="px-4 py-3 text-end text-danger fw-medium">₹{stats?.flipkart.loss.toLocaleString('en-IN') || '0.00'}</td>
                                            <td className="px-4 py-3 text-end fw-bold">₹{stats?.flipkart.settlement.toLocaleString('en-IN') || '0.00'}</td>
                                        </tr>
                                        {/* Meesho Row */}
                                        <tr>
                                            <td className="px-4 py-3">
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="bg-danger rounded-circle" style={{ width: '12px', height: '12px' }}></div>
                                                    <span className="fw-bold">Meesho</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">{stats?.meesho.count || 0}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="text-success fw-medium">{stats?.meesho.deliveredCount || 0}</span>
                                                <div className="small text-muted">({((stats?.meesho.deliveredCount || 0) / (stats?.meesho.count || 1) * 100).toFixed(0)}%)</div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="text-warning fw-medium">{stats?.meesho.rtoCount || 0}</span>
                                                <div className="small text-muted">({((stats?.meesho.rtoCount || 0) / (stats?.meesho.count || 1) * 100).toFixed(0)}%)</div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="text-info fw-medium">{stats?.meesho.returnCount || 0}</span>
                                                <div className="small text-muted">({((stats?.meesho.returnCount || 0) / (stats?.meesho.count || 1) * 100).toFixed(0)}%)</div>
                                            </td>
                                            <td className="px-4 py-3 text-end fw-medium">₹{stats?.meesho.sales.toLocaleString('en-IN') || '0.00'}</td>
                                            <td className="px-4 py-3 text-end text-success fw-medium">₹{stats?.meesho.profit.toLocaleString('en-IN') || '0.00'}</td>
                                            <td className="px-4 py-3 text-end text-danger fw-medium">₹{stats?.meesho.loss.toLocaleString('en-IN') || '0.00'}</td>
                                            <td className="px-4 py-3 text-end fw-bold">₹{stats?.meesho.settlement.toLocaleString('en-IN') || '0.00'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                {/* SKU Performance */}
                <div className="col-md-7">
                    <div className="card shadow-sm border-0 mb-4 text-nowrap">
                        <div className="card-header bg-white border-0 py-3 d-flex align-items-center gap-2">
                            <Package className="text-primary" size={20} />
                            <h5 className="mb-0 fw-bold">Combined SKU Performance</h5>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0 small">
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="px-4 py-3 text-secondary text-uppercase small fw-bold">SKU Name</th>
                                            <th className="px-4 py-3 text-secondary text-uppercase small fw-bold text-center">Qty Sold</th>
                                            <th className="px-4 py-3 text-secondary text-uppercase small fw-bold text-end">Sales Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan={3} className="text-center py-4 text-secondary">Loading performance data...</td></tr>
                                        ) : !stats?.skuPerformance.length ? (
                                            <tr><td colSpan={3} className="text-center py-4 text-secondary text-nowrap">No data available</td></tr>
                                        ) : (
                                            stats.skuPerformance.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-4 py-3 fw-medium text-truncate" style={{ maxWidth: '250px' }}>{item.sku}</td>
                                                    <td className="px-4 py-3 text-center">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-end fw-bold">₹{item.sales.toLocaleString('en-IN')}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Records */}
                <div className="col-md-5">
                    <div className="card shadow-sm border-0 h-100">
                        <div className="card-header bg-white border-0 py-3 d-flex align-items-center gap-2">
                            <History className="text-primary" size={20} />
                            <h5 className="mb-0 fw-bold">Recent Records</h5>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0 small text-nowrap">
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="px-3 py-3 text-secondary text-uppercase small fw-bold">Order ID</th>
                                            <th className="px-3 py-3 text-secondary text-uppercase small fw-bold">Channel</th>
                                            <th className="px-3 py-3 text-secondary text-uppercase small fw-bold text-end">Settlement</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan={3} className="text-center py-4 text-secondary">Loading records...</td></tr>
                                        ) : !stats?.recentRecords.length ? (
                                            <tr><td colSpan={3} className="text-center py-4 text-secondary ">No records found</td></tr>
                                        ) : (
                                            stats.recentRecords.map((record, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-3 py-2">
                                                        <div className="fw-bold text-truncate" style={{ maxWidth: '120px' }}>{record.orderId || 'N/A'}</div>
                                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{new Date(record.date).toLocaleDateString()}</div>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <span className={`badge ${record.channel === 'Flipkart' ? 'bg-primary' : 'bg-danger'}`}>
                                                            {record.channel}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-end">
                                                        <div className="fw-bold">₹{(record.amount || 0).toLocaleString('en-IN')}</div>
                                                        <div className={`fw-bold small ${record.profitLoss && record.profitLoss >= 0 ? 'text-success' : 'text-danger'}`}>
                                                            {record.profitLoss && record.profitLoss >= 0 ? '+' : ''}{record.profitLoss?.toLocaleString('en-IN')}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
