import React, { useMemo } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { ShoppingCart, TrendingUp, TrendingDown, Landmark, Package } from 'lucide-react';
import type { FlipkartOrder } from '../types';

const Dashboard: React.FC = () => {
    const { data: flipkartOrders, loading: ordersLoading } = useFirestore<FlipkartOrder>('flipkartOrders');

    const stats = useMemo(() => {
        if (!flipkartOrders.length) return null;

        const totalSales = flipkartOrders.reduce((sum, order) => sum + (order.sellerPrice || 0), 0);
        const totalProfit = flipkartOrders.reduce((sum, order) => sum + (order.profitLoss && order.profitLoss > 0 ? order.profitLoss : 0), 0);
        const totalLoss = flipkartOrders.reduce((sum, order) => sum + (order.profitLoss && order.profitLoss < 0 ? Math.abs(order.profitLoss) : 0), 0);
        const totalSettlement = flipkartOrders.reduce((sum, order) => sum + (order.bankSettlement || 0), 0);

        // SKU Performance
        const skuMap: Record<string, { quantity: number; sales: number }> = {};
        flipkartOrders.forEach(order => {
            if (!order.sku) return;
            if (!skuMap[order.sku]) {
                skuMap[order.sku] = { quantity: 0, sales: 0 };
            }
            skuMap[order.sku].quantity += (order.quantity || 0);
            skuMap[order.sku].sales += (order.sellerPrice || 0);
        });

        const skuPerformance = Object.entries(skuMap)
            .map(([sku, data]) => ({ sku, ...data }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 10); // Top 10

        return {
            totalSales,
            totalProfit,
            totalLoss,
            totalSettlement,
            skuPerformance
        };
    }, [flipkartOrders]);

    return (
        <div className="container-fluid py-4">
            <h1 className="h3 mb-4 fw-bold text-gray-800">Dashboard Overview</h1>

            <div className="row g-4 mb-4">
                <div className="col-md-3">
                    <div className="card shadow-sm border-0 h-100 bg-primary text-white">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="card-subtitle fw-bold text-uppercase small opacity-75">Total Sales</h6>
                                <ShoppingCart size={20} className="opacity-75" />
                            </div>
                            <p className="card-text h3 fw-bold mb-0">₹{stats?.totalSales.toLocaleString('en-IN') || '0.00'}</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card shadow-sm border-0 h-100 bg-success text-white">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="card-subtitle fw-bold text-uppercase small opacity-75">Net Profit</h6>
                                <TrendingUp size={20} className="opacity-75" />
                            </div>
                            <p className="card-text h3 fw-bold mb-0">₹{stats?.totalProfit.toLocaleString('en-IN') || '0.00'}</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card shadow-sm border-0 h-100 bg-danger text-white">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="card-subtitle fw-bold text-uppercase small opacity-75">Total Loss</h6>
                                <TrendingDown size={20} className="opacity-75" />
                            </div>
                            <p className="card-text h3 fw-bold mb-0">₹{stats?.totalLoss.toLocaleString('en-IN') || '0.00'}</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card shadow-sm border-0 h-100 bg-info text-white">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="card-subtitle fw-bold text-uppercase small opacity-75">Settlement</h6>
                                <Landmark size={20} className="opacity-75" />
                            </div>
                            <p className="card-text h3 fw-bold mb-0">₹{stats?.totalSettlement.toLocaleString('en-IN') || '0.00'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-md-8">
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-white border-0 py-3 d-flex align-items-center gap-2">
                            <Package className="text-primary" size={20} />
                            <h5 className="mb-0 fw-bold">Top SKUs Performance</h5>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="px-4 py-3 text-secondary text-uppercase small fw-bold">SKU Name</th>
                                            <th className="px-4 py-3 text-secondary text-uppercase small fw-bold text-center">Qty Sold</th>
                                            <th className="px-4 py-3 text-secondary text-uppercase small fw-bold text-end">Sales Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ordersLoading ? (
                                            <tr><td colSpan={3} className="text-center py-4">Loading performance data...</td></tr>
                                        ) : !stats?.skuPerformance.length ? (
                                            <tr><td colSpan={3} className="text-center py-4">No data available</td></tr>
                                        ) : (
                                            stats.skuPerformance.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-4 py-3 fw-medium">{item.sku}</td>
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
                <div className="col-md-4">
                    <div className="card shadow-sm border-0 h-100">
                        <div className="card-header bg-white border-0 py-3">
                            <h5 className="mb-0 fw-bold">Quick Tips</h5>
                        </div>
                        <div className="card-body">
                            <div className="mb-3 p-3 rounded bg-light border-start border-4 border-primary">
                                <h6 className="fw-bold mb-1 small text-primary">Optimize Returns</h6>
                                <p className="small mb-0 text-muted">Identify high-return SKUs and check product condition trends.</p>
                            </div>
                            <div className="mb-3 p-3 rounded bg-light border-start border-4 border-success">
                                <h6 className="fw-bold mb-1 small text-success">Profit Margin</h6>
                                <p className="small mb-0 text-muted">Focus on SKUs with higher bank settlement to improve overall profit.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
