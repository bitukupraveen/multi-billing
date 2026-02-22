import React, { useMemo } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import {
    ShoppingCart,
    TrendingUp,
    TrendingDown,
    Landmark,
    Package,
    History,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    Activity
} from 'lucide-react';

import { Link } from 'react-router-dom';
import type {
    FlipkartOrder,
    MeeshoOrder,
    FlipkartGSTReportRecord,
    FlipkartCashBackReportRecord,
    MeeshoSalesRepoRecord,
    MeeshoSalesReturnRecord,
    Product
} from '../types';

const LOSS_PER_RETURN = 200; // Shipping + Packaging + Damage estimate


const Dashboard: React.FC = () => {
    const { data: flipkartOrders, loading: flipkartLoading } = useFirestore<FlipkartOrder>('flipkartOrders');
    const { data: meeshoOrders, loading: meeshoLoading } = useFirestore<MeeshoOrder>('meeshoOrders');
    const { data: products, loading: productsLoading } = useFirestore<Product>('products');

    // Additional data for cross-validation
    const { data: flipkartGst, loading: flipkartGstLoading } = useFirestore<FlipkartGSTReportRecord>('flipkartGstReports');
    const { data: flipkartCashback, loading: flipkartCashbackLoading } = useFirestore<FlipkartCashBackReportRecord>('flipkartCashBackReports');
    const { data: meeshoSales, loading: meeshoSalesLoading } = useFirestore<MeeshoSalesRepoRecord>('meeshoSalesReports');
    const { data: meeshoReturns, loading: meeshoReturnsLoading } = useFirestore<MeeshoSalesReturnRecord>('meeshoSalesReturnReports');

    const loading = flipkartLoading || meeshoLoading || flipkartGstLoading || flipkartCashbackLoading || meeshoSalesLoading || meeshoReturnsLoading || productsLoading;

    const stats = useMemo(() => {
        if (!flipkartOrders.length && !meeshoOrders.length && !loading) return null;

        const initStats = () => ({
            sales: 0,
            profit: 0,
            loss: 0,
            settlement: 0,
            count: 0,
            deliveredCount: 0,
            rtoCount: 0,
            returnCount: 0,
            returnLoss: 0,
            avgReturnLossPerOrder: 0
        });


        const overall = initStats();
        const flipkart = initStats();
        const meesho = initStats();

        // Create SKU Map
        const skuCostMap = new Map<string, number>();
        products.forEach(p => {
            if (p.sku) skuCostMap.set(p.sku.toLowerCase(), p.purchasePrice || 0);
        });

        // Process Flipkart
        flipkartOrders.forEach(order => {
            const s = (order.totalSaleAmount || order.saleAmount || 0);
            const set = (order.bankSettlementValue || 0);

            // Profit Calc
            let cost = 0;
            if (order.sellerSku) {
                const sku = order.sellerSku.toLowerCase();
                cost = (skuCostMap.get(sku) || 0) * (order.quantity || 1);
            }
            const pl = set - cost;

            flipkart.sales += s;
            flipkart.settlement += set;
            flipkart.count += 1;
            if (pl > 0) flipkart.profit += pl;
            else if (pl < 0) flipkart.loss += Math.abs(pl);

            // Priority: orderStatus (GST Sync) -> itemReturnStatus (Original)
            const status = order.orderStatus || order.itemReturnStatus || '';
            const statusLower = status.toLowerCase();

            if (!status || statusLower === 'delivered' || statusLower === 'sale') {
                flipkart.deliveredCount += 1;
                overall.deliveredCount += 1;
            } else if (statusLower === 'return' || statusLower === 'logisticsreturn' || statusLower === 'rto') {
                flipkart.rtoCount += 1;
                overall.rtoCount += 1;
            } else if (statusLower === 'customerreturn' || statusLower === 'return') {
                flipkart.returnCount += 1;
                overall.returnCount += 1;
            } else if (statusLower === 'cancelled') {
                // Could add cancelledCount to metrics if needed, for now treat as part of returns/rto or ignore
                flipkart.rtoCount += 1;
                overall.rtoCount += 1;
            }

            overall.sales += s;
            overall.settlement += set;
            overall.count += 1;
            if (pl > 0) overall.profit += pl;
            else if (pl < 0) overall.loss += Math.abs(pl);
        });

        // Process Meesho
        meeshoOrders.forEach(order => {
            const s = (order.totalSaleAmount || 0);
            const set = (order.finalSettlementAmount || 0);

            // Profit Calc
            let cost = 0;
            if (order.supplierSku) {
                const sku = order.supplierSku.toLowerCase();
                cost = (skuCostMap.get(sku) || 0) * (order.quantity || 1);
            }
            const pl = set - cost;

            meesho.sales += s;
            meesho.settlement += set;
            meesho.count += 1;
            if (pl > 0) meesho.profit += pl;
            else if (pl < 0) meesho.loss += Math.abs(pl);

            const status = order.liveOrderStatus || '';
            if (status === 'Delivered') {
                meesho.deliveredCount += 1;
                overall.deliveredCount += 1;
            } else if (status === 'RTO' || status.includes('Returned to Seller')) {
                meesho.rtoCount += 1;
                overall.rtoCount += 1;
            } else if (status === 'Return' || status === 'Customer Return') {
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
            const sku = order.sellerSku;
            if (!sku) return;
            if (!skuMap[sku]) skuMap[sku] = { quantity: 0, sales: 0 };
            skuMap[sku].quantity += (order.quantity || 0);
            skuMap[sku].sales += (order.totalSaleAmount || order.saleAmount || 0);
        });

        meeshoOrders.forEach(order => {
            const sku = order.supplierSku;
            if (!sku) return;
            if (!skuMap[sku]) skuMap[sku] = { quantity: 0, sales: 0 };
            skuMap[sku].quantity += (order.quantity || 0);
            skuMap[sku].sales += (order.totalSaleAmount || 0);
        });

        const skuPerformance = Object.entries(skuMap)
            .map(([sku, data]) => ({ sku, ...data }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 10);

        // Recent Records with enhanced date sorting
        const getDisplayDate = (dateStr: string) => dateStr ? new Date(dateStr) : new Date(0);

        const recentFlipkart = flipkartOrders.map(o => ({
            id: o.id,
            channel: 'Flipkart',
            orderId: o.orderId,
            sku: o.sellerSku,
            amount: o.bankSettlementValue,
            date: o.orderDate || o.paymentDate || o.uploadDate,
            profitLoss: o.profitLoss
        }));

        const recentMeesho = meeshoOrders.map(o => ({
            id: o.id,
            channel: 'Meesho',
            orderId: o.subOrderNo,
            sku: o.supplierSku,
            amount: o.finalSettlementAmount,
            date: o.orderDate || o.paymentDate || o.uploadDate,
            profitLoss: o.profitLoss
        }));

        const recentRecords = [...recentFlipkart, ...recentMeesho]
            .sort((a, b) => getDisplayDate(b.date).getTime() - getDisplayDate(a.date).getTime())
            .slice(0, 12);

        // Financial Health & Cross-Validation
        const financial = {
            gstLiability: 0,
            tcsCredits: 0,
            unverifiedGap: 0,
            verifiedSales: 0
        };

        flipkartGst.forEach(g => {
            financial.verifiedSales += (g.finalInvoiceAmount || 0);
            financial.gstLiability += (g.igstAmount || 0) + (g.cgstAmount || 0) + (g.sgstAmount || 0);
        });

        meeshoSales.forEach(s => {
            financial.verifiedSales += (s.totalInvoiceValue || 0);
            financial.gstLiability += (s.taxAmount || 0);
        });

        flipkartCashback.forEach(c => {
            financial.tcsCredits += (c.totalTcsDeducted || 0);
        });

        // The gap represents orders that haven't shown up in GST/Sales reports yet
        financial.unverifiedGap = Math.abs(overall.sales - financial.verifiedSales);

        // Final Return Loss Calculations
        const finalCalc = (s: any) => {
            const totalRet = s.rtoCount + s.returnCount;
            s.returnLoss = totalRet * LOSS_PER_RETURN;
            s.avgReturnLossPerOrder = s.count > 0 ? s.returnLoss / s.count : 0;
        };

        finalCalc(overall);
        finalCalc(flipkart);
        finalCalc(meesho);

        return {
            overall,
            flipkart,
            meesho,
            skuPerformance,
            recentRecords,
            financial,
            LOSS_PER_RETURN
        };

    }, [flipkartOrders, meeshoOrders, flipkartGst, flipkartCashback, meeshoSales, meeshoReturns, loading]);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100 flex-column gap-3">
                <div className="spinner-grow text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                    <span className="visually-hidden">Loading...</span>
                </div>
                <h5 className="text-secondary fw-medium animate-pulse">Analyzing Business Intelligence...</h5>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="container-fluid py-5 text-center">
                <div className="max-w-md mx-auto py-5">
                    <History size={80} className="text-muted mb-4 opacity-25 mx-auto" />
                    <h2 className="fw-bold text-dark mb-3">No Operational Data</h2>
                    <p className="text-secondary mb-5">Upload your Flipkart or Meesho reports to generate comprehensive business analytics and performance insights.</p>
                    <div className="d-flex gap-3 justify-content-center">
                        <Link to="/flipkart-report" className="btn btn-primary px-4 py-2 rounded-pill shadow-sm">
                            Go to Reports
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const formatINR = (val: number) => `₹${(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    const MetricCard = ({ title, value, icon: Icon, gradient, subValue }: any) => (
        <div className={`card dashboard-card border-0 shadow-sm overflow-hidden h-100 ${gradient} text-white`}>
            <div className="card-body p-4 position-relative">
                <div className="position-absolute opacity-10" style={{ right: '-15px', top: '-15px', zIndex: 0 }}>
                    <Icon size={100} />
                </div>
                <div className="d-flex align-items-center gap-3 mb-3 position-relative" style={{ zIndex: 1 }}>
                    <div className="bg-white bg-opacity-20 rounded-lg backdrop-blur-sm d-flex align-items-center justify-content-center shadow-sm" style={{ width: '40px', height: '40px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Icon size={20} className="text-white" />
                    </div>
                    <h6 className="mb-0 text-uppercase fw-bold small ls-wide opacity-90" style={{ letterSpacing: '0.05rem' }}>{title}</h6>
                </div>
                <div className="position-relative" style={{ zIndex: 1 }}>
                    <h2 className="display-6 fw-bold mb-1">{formatINR(value)}</h2>
                    {subValue && <div className="small opacity-80 fw-medium">{subValue}</div>}
                </div>
            </div>
        </div>
    );

    return (
        <div className="container-fluid py-4 px-lg-4">
            {/* Header Section */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-5 gap-3">
                <div>
                    <h1 className="display-5 fw-bold text-dark mb-1">Intelligence <span className="text-primary">Overview</span></h1>
                    <p className="text-secondary mb-0 fw-medium">Unified performance analytics across all e-commerce channels</p>
                </div>
                <div className="d-flex gap-2">
                    <div className="bg-white p-2 rounded-4 shadow-sm border d-flex gap-3 align-items-center px-3" style={{ height: '48px' }}>
                        <div className="d-flex align-items-center gap-2 border-end pe-3 h-100">
                            <div className="bg-success rounded-circle animate-pulse" style={{ width: '8px', height: '8px' }}></div>
                            <span className="small fw-bold text-dark text-nowrap" style={{ lineHeight: 1 }}>Live Updates</span>
                        </div>
                        <div className="d-flex align-items-center justify-content-center h-100">
                            <BarChart3 className="text-primary" size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="row g-4 mb-5">
                <div className="col-lg-3 col-md-6">
                    <MetricCard title="Gross Sales" value={stats.overall.sales} icon={ShoppingCart} gradient="gradient-primary" subValue={`${stats.overall.count} total orders across platforms`} />
                </div>
                <div className="col-lg-3 col-md-6">
                    <MetricCard title="Net Profit" value={stats.overall.profit} icon={TrendingUp} gradient="gradient-success" subValue={`Margin: ${((stats.overall.profit / (stats.overall.sales || 1)) * 100).toFixed(1)}%`} />
                </div>
                <div className="col-lg-3 col-md-6">
                    <MetricCard title="Operational Loss" value={stats.overall.loss} icon={TrendingDown} gradient="gradient-danger" subValue={`Returns Impact: ${((stats.overall.loss / (stats.overall.sales || 1)) * 100).toFixed(1)}%`} />
                </div>
                <div className="col-lg-3 col-md-6">
                    <MetricCard title="Bank Settlement" value={stats.overall.settlement} icon={Landmark} gradient="gradient-info" subValue={`Cash Flow Recovery: ${((stats.overall.settlement / (stats.overall.sales || 1)) * 100).toFixed(0)}%`} />
                </div>
            </div>

            {/* Status & Channel Section */}
            <div className="row g-4 mb-5">
                <div className="col-xl-8">
                    <div className="card dashboard-card border-0 shadow-sm h-100 glass-card">
                        <div className="card-header bg-transparent border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
                            <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                                <BarChart3 size={20} className="text-primary" />
                                Channel Performance
                            </h5>
                        </div>
                        <div className="card-body p-4">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="bg-light bg-opacity-50">
                                        <tr className="small text-uppercase text-muted fw-bold">
                                            <th className="border-0 px-4 py-3">Platform</th>
                                            <th className="border-0 px-4 py-3 text-center">Delivered</th>
                                            <th className="border-0 px-4 py-3 text-center">RTO/Ret</th>
                                            <th className="border-0 px-4 py-3 text-end">Sales</th>
                                            <th className="border-0 px-4 py-3 text-end">Net P/L</th>
                                            <th className="border-0 px-4 py-3 text-end">Settlement</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { name: 'Flipkart', data: stats.flipkart, color: '#2874f0' },
                                            { name: 'Meesho', data: stats.meesho, color: '#ff4757' }
                                        ].map(channel => (
                                            <tr key={channel.name}>
                                                <td className="px-4 py-4">
                                                    <div className="d-flex align-items-center gap-3">
                                                        <div style={{ backgroundColor: channel.color, width: '4px', height: '24px', borderRadius: '4px' }}></div>
                                                        <span className="fw-bold h6 mb-0">{channel.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <div className="fw-bold text-success h6 mb-0">{((channel.data.deliveredCount / (channel.data.count || 1)) * 100).toFixed(0)}%</div>
                                                    <div className="small text-muted">{channel.data.deliveredCount} orders</div>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <div className="fw-bold text-danger h6 mb-0">{(((channel.data.rtoCount + channel.data.returnCount) / (channel.data.count || 1)) * 100).toFixed(0)}%</div>
                                                    <div className="small text-muted">{channel.data.rtoCount + channel.data.returnCount} orders</div>
                                                </td>
                                                <td className="px-4 py-4 text-end fw-bold">{formatINR(channel.data.sales)}</td>
                                                <td className="px-4 py-4 text-end">
                                                    <div className={`fw-bold h6 mb-0 ${channel.data.profit >= channel.data.loss ? 'text-success' : 'text-danger'}`}>
                                                        {formatINR(channel.data.profit - channel.data.loss)}
                                                    </div>
                                                    <div className="small text-muted">Margin: {(((channel.data.profit - channel.data.loss) / (channel.data.sales || 1)) * 100).toFixed(1)}%</div>
                                                </td>
                                                <td className="px-4 py-4 text-end">
                                                    <div className="fw-bold h6 mb-0">{formatINR(channel.data.settlement)}</div>
                                                    <div className="progress mt-1" style={{ height: '3px' }}>
                                                        <div className="progress-bar" style={{ width: `${(channel.data.settlement / (channel.data.sales || 1)) * 100}%`, backgroundColor: channel.color }}></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-xl-4">
                    <div className="card dashboard-card border-0 shadow-sm h-100 glass-card">
                        <div className="card-header bg-transparent border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
                            <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                                <Activity size={20} className="text-primary" />
                                Return Management Analysis
                            </h5>
                        </div>
                        <div className="card-body p-4">
                            <div className="d-flex flex-column gap-4">
                                <div className="p-3 rounded-4 bg-danger bg-opacity-10 border-danger border-opacity-10 border">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <span className="small fw-bold text-danger text-uppercase">Total Return Loss</span>
                                        <div className="badge bg-danger rounded-pill">Est. ₹{stats.LOSS_PER_RETURN}/Unit</div>
                                    </div>
                                    <h3 className="fw-bold text-danger mb-0">{formatINR(stats.overall.returnLoss)}</h3>
                                    <div className="small text-danger opacity-75 mt-1">Impact on overall gross profit</div>
                                </div>

                                <div className="p-4 rounded-4 bg-light border-white border text-center">
                                    <div className="small fw-bold text-muted text-uppercase mb-2">Avg Return Loss per Order</div>
                                    <h2 className="fw-bold text-dark display-6 mb-1">₹{stats.overall.avgReturnLossPerOrder.toFixed(2)}</h2>
                                    <div className="small text-primary fw-medium mt-3 px-3 py-2 bg-white rounded-pill shadow-sm d-inline-block border">
                                        <TrendingDown size={14} className="me-1" />
                                        Formula: (Total Returns × {stats.LOSS_PER_RETURN}) / {stats.overall.count} Orders
                                    </div>
                                </div>

                                <div className="row g-2">
                                    <div className="col-6">
                                        <div className="p-3 rounded-4 bg-white border text-start">
                                            <div className="small text-muted mb-1">Flipkart Avg</div>
                                            <div className="fw-bold h5 mb-0 text-primary">₹{stats.flipkart.avgReturnLossPerOrder.toFixed(2)}</div>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="p-3 rounded-4 bg-white border text-start">
                                            <div className="small text-muted mb-1">Meesho Avg</div>
                                            <div className="fw-bold h5 mb-0 text-warning">₹{stats.meesho.avgReturnLossPerOrder.toFixed(2)}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-center">
                                    <p className="small text-muted italic mb-0">Managing returns efficiently can improve margins by up to 5-10%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <div className="row g-4">
                {/* SKU Rankings */}
                <div className="col-lg-7">
                    <div className="card dashboard-card border-0 shadow-sm h-100 overflow-hidden">
                        <div className="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
                            <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                                <Package size={20} className="text-primary" />
                                Top Performing SKUs
                            </h5>
                        </div>
                        <div className="card-body p-4">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="small text-uppercase text-muted fw-bold">
                                        <tr>
                                            <th className="border-0 pb-3">SKU Name</th>
                                            <th className="border-0 pb-3 text-center">Orders</th>
                                            <th className="border-0 pb-3 text-end">Revenue</th>
                                            <th className="border-0 pb-3 text-end">Trend</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.skuPerformance.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="py-3 px-0">
                                                    <div className="d-flex align-items-center gap-3">
                                                        <div className="bg-light rounded p-2 text-primary fw-bold" style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {idx + 1}
                                                        </div>
                                                        <div className="fw-bold text-truncate" style={{ maxWidth: '250px' }}>{item.sku}</div>
                                                    </div>
                                                </td>
                                                <td className="py-3 text-center fw-medium">{item.quantity}</td>
                                                <td className="py-3 text-end fw-bold">{formatINR(item.sales)}</td>
                                                <td className="py-3">
                                                    <div className="d-flex align-items-center justify-content-end">
                                                        <ArrowUpRight className="text-success" size={18} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Real-time Activity */}
                <div className="col-lg-5">
                    <div className="card dashboard-card border-0 shadow-sm h-100 overflow-hidden">
                        <div className="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
                            <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                                <History size={20} className="text-primary" />
                                Recent Activity
                            </h5>
                            <button className="btn btn-link text-primary text-decoration-none small fw-bold">View Ledger</button>
                        </div>
                        <div className="card-body p-4">
                            <div className="d-flex flex-column gap-3">
                                {stats.recentRecords.map((record, idx) => (
                                    <div key={idx} className="d-flex align-items-center justify-content-between p-3 rounded-4 bg-light border border-white transition-all hover-scale cursor-pointer">
                                        <div className="d-flex align-items-center gap-3 overflow-hidden">
                                            <div className={`p-2 rounded-lg text-white ${record.channel === 'Flipkart' ? 'bg-primary' : 'bg-danger'}`} style={{ minWidth: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {record.channel === 'Flipkart' ? 'F' : 'M'}
                                            </div>
                                            <div className="overflow-hidden">
                                                <div className="fw-bold text-dark text-truncate" style={{ maxWidth: '140px' }}>ID: {record.orderId}</div>
                                                <div className="small text-muted">{new Date(record.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                            </div>
                                        </div>
                                        <div className="text-end">
                                            <div className="fw-bold text-dark">{formatINR(record.amount || 0)}</div>
                                            {record.profitLoss !== undefined ? (
                                                <div className={`small fw-bold d-flex align-items-center justify-content-end ${record.profitLoss >= 0 ? 'text-success' : 'text-danger'}`}>
                                                    {record.profitLoss >= 0 ? <ArrowUpRight size={14} className="me-1" /> : <ArrowDownRight size={14} className="me-1" />}
                                                    {Math.abs(record.profitLoss).toLocaleString('en-IN')}
                                                </div>
                                            ) : (
                                                <div className="small text-muted italic">Processing...</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .backdrop-blur-sm { backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
                .ls-wide { letter-spacing: 0.05em; }
                .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .5; }
                }
                .shadow-inner { box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06); }
            `}</style>
        </div>
    );
};

export default Dashboard;

