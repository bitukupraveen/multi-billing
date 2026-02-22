import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp,
    DollarSign,
    ShoppingBag,
    ShieldCheck,
    RotateCcw,
    Activity,
    Zap,
    CheckCircle2,
    Loader2
} from 'lucide-react';


import { useFirestore } from '../hooks/useFirestore';
import type { MeeshoOrder, MeeshoSalesRepoRecord, MeeshoSalesReturnRecord } from '../types';

const LOSS_PER_RETURN = 200;


const MeeshoDashboard: React.FC = () => {
    const navigate = useNavigate();

    const { data: orders, loading: ordersLoading } = useFirestore<MeeshoOrder>('meeshoOrders');
    const { data: salesReports, loading: salesLoading } = useFirestore<MeeshoSalesRepoRecord>('meeshoSalesReports');
    const { data: returnReports, loading: returnLoading } = useFirestore<MeeshoSalesReturnRecord>('meeshoSalesReturnReports');

    const loading = ordersLoading || salesLoading || returnLoading;

    const analysis = useMemo(() => {
        if (!orders.length && !salesReports.length && !returnReports.length && !loading) return null;

        const stats = {
            grossSales: 0,
            returnsValue: 0,
            netRealization: 0,
            netProfit: 0,
            totalTax: 0,
            orderCount: orders.length,
            deliveredCount: 0,
            returnCount: 0,
            efficiencyScore: 0,
            bankSettlement: 0 as number,
            returnLoss: 0,
            avgReturnLossPerOrder: 0
        };


        orders.forEach(o => {
            stats.netProfit += (o.profitLoss || 0);
            stats.bankSettlement += (o.finalSettlementAmount || 0);
            // Rough status estimation if not explicit
            if ((o.finalSettlementAmount || 0) > 0) stats.deliveredCount++;
        });

        salesReports.forEach(s => {
            stats.grossSales += (s.totalInvoiceValue || 0);
            stats.totalTax += (s.taxAmount || 0);
        });

        returnReports.forEach(r => {
            stats.returnsValue += (r.totalInvoiceValue || 0);
            stats.returnCount++;
        });

        stats.netRealization = stats.grossSales - stats.returnsValue;
        stats.efficiencyScore = stats.orderCount > 0 ? ((stats.orderCount - stats.returnCount) / stats.orderCount) * 100 : 0;

        stats.returnLoss = stats.returnCount * LOSS_PER_RETURN;
        stats.avgReturnLossPerOrder = stats.orderCount > 0 ? stats.returnLoss / stats.orderCount : 0;


        return stats;
    }, [orders, salesReports, returnReports, loading]);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100 flex-column gap-3">
                <Loader2 size={48} className="animate-spin text-warning" />
                <h5 className="text-secondary fw-semibold">Analyzing Meesho Business Intelligence...</h5>
            </div>
        );
    }

    if (!analysis) {
        return (
            <div className="container-fluid py-5 text-center">
                <div className="max-w-md mx-auto py-5">
                    <Activity size={80} className="text-muted mb-4 opacity-25 mx-auto" />
                    <h2 className="fw-bold text-dark mb-3">No Meesho Intelligence Available</h2>
                    <p className="text-secondary mb-5">Upload your Meesho Order, Sales, or Return reports to generate unified business insights.</p>
                    <button className="btn btn-warning px-5 py-3 rounded-pill shadow text-white fw-bold" onClick={() => navigate('/meesho-report')}>
                        Access Reports
                    </button>
                </div>
            </div>
        );
    }

    const formatINR = (val: number) => `₹${(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    const MetricCard = ({ title, value, icon: Icon, gradient, detail }: any) => (
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
                    {detail && <div className="small opacity-80 fw-medium">{detail}</div>}
                </div>
            </div>
        </div>
    );

    return (
        <div className="container-fluid py-4 px-lg-4">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-5 gap-3">
                <div>
                    <h1 className="display-5 fw-bold text-dark mb-1">Meesho <span className="text-warning">Analytics</span></h1>
                    <p className="text-secondary mb-0 fw-medium">Real-time revenue realization and operational efficiency</p>
                </div>
                <div className="bg-white p-2 rounded-4 shadow-sm border d-flex gap-3 align-items-center px-3" style={{ height: '48px' }}>
                    <div className="d-flex align-items-center gap-2 border-end pe-3 text-warning h-100">
                        <Zap size={18} fill="currentColor" />
                        <span className="small fw-bold" style={{ lineHeight: 1 }}>Active Stream</span>
                    </div>
                    <div className="d-flex align-items-center justify-content-center h-100">
                        <CheckCircle2 className="text-success" size={20} />
                    </div>
                </div>
            </div>

            {/* Top Metrics */}
            <div className="row g-4 mb-5">
                <div className="col-lg-3 col-md-6">
                    <MetricCard title="Gross Logistics Value" value={analysis.grossSales} icon={ShoppingBag} gradient="gradient-warning" detail={`${analysis.orderCount} Orders Synchronized`} />
                </div>
                <div className="col-lg-3 col-md-6">
                    <MetricCard title="Net Profit (Calculated)" value={analysis.netProfit} icon={DollarSign} gradient="gradient-success" detail={`Realization: ${((analysis.netRealization / (analysis.grossSales || 1)) * 100).toFixed(1)}%`} />
                </div>
                <div className="col-lg-3 col-md-6">
                    <MetricCard title="Sales Returns" value={analysis.returnsValue} icon={RotateCcw} gradient="gradient-danger" detail={`${analysis.returnCount} Units Returned`} />
                </div>
                <div className="col-lg-3 col-md-6">
                    <MetricCard title="Total GST Collected" value={analysis.totalTax} icon={ShieldCheck} gradient="gradient-info" detail="Verified from Sales Ledger" />
                </div>
            </div>

            <div className="row g-4 mb-5">
                {/* Revenue Realization */}
                <div className="col-xl-8">
                    <div className="card dashboard-card border-0 shadow-sm h-100 glass-card">
                        <div className="card-header bg-transparent border-0 p-4 pb-0">
                            <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                                <TrendingUp size={20} className="text-success" />
                                Revenue Realization Funnel
                            </h5>
                        </div>
                        <div className="card-body p-4">
                            <div className="mb-4">
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-secondary fw-medium">Gross Invoiced Volume</span>
                                    <span className="fw-bold text-dark">{formatINR(analysis.grossSales)}</span>
                                </div>
                                <div className="progress rounded-pill bg-light" style={{ height: '12px' }}>
                                    <div className="progress-bar bg-primary" style={{ width: '100%' }}></div>
                                </div>
                            </div>

                            <div className="mb-4">
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-secondary fw-medium">Sales Returns (RTO/Returns)</span>
                                    <span className="fw-bold text-danger">-{formatINR(analysis.returnsValue)}</span>
                                </div>
                                <div className="progress rounded-pill bg-light" style={{ height: '12px' }}>
                                    <div className="progress-bar bg-danger" style={{ width: `${(analysis.returnsValue / (analysis.grossSales || 1)) * 100}%` }}></div>
                                </div>
                            </div>

                            <div className="p-4 rounded-4 bg-success bg-opacity-10 border-success border-opacity-10 border">
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 className="fw-bold text-success mb-1">Net Revenue Realization</h6>
                                        <p className="small text-success opacity-75 mb-0">Total money actually processed after returns</p>
                                    </div>
                                    <h2 className="fw-bold text-success mb-0">{formatINR(analysis.netRealization)}</h2>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Efficiency Score */}
                <div className="col-xl-4">
                    <div className="card dashboard-card border-0 shadow-sm h-100 bg-white">
                        <div className="card-header bg-transparent border-0 p-4 pb-0">
                            <h5 className="fw-bold mb-0">Return Management</h5>
                        </div>
                        <div className="card-body p-4 text-center">
                            <div className="p-3 rounded-4 bg-danger bg-opacity-10 border-danger border-opacity-10 border mb-4">
                                <div className="small fw-bold text-danger text-uppercase mb-1">Est. Return Loss</div>
                                <h3 className="fw-bold text-danger mb-0">{formatINR(analysis.returnLoss)}</h3>
                            </div>

                            <div className="p-3 rounded-4 bg-light border-white border mb-4">
                                <div className="small fw-bold text-muted text-uppercase mb-1">Avg Loss per Order</div>
                                <h4 className="fw-bold text-dark mb-1">₹{analysis.avgReturnLossPerOrder.toFixed(2)}</h4>
                                <div className="extra-small text-primary mt-2">
                                    Formula: ({analysis.returnCount} Returns × {LOSS_PER_RETURN}) / {analysis.orderCount} Orders
                                </div>
                            </div>

                            <div className="d-flex justify-content-around mt-2">
                                <div className="text-center">
                                    <div className="h5 fw-bold mb-0 text-success">{analysis.deliveredCount}</div>
                                    <div className="small text-muted">Successful</div>
                                </div>
                                <div className="vr"></div>
                                <div className="text-center">
                                    <div className="h5 fw-bold mb-0 text-danger">{analysis.returnCount}</div>
                                    <div className="small text-muted">Returned</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <style>{`
                .glass-card { background: rgba(255,255,255,0.7); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3); }
                .gradient-warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
                .dashboard-card { border-radius: 1.5rem; transition: transform 0.3s ease; }
                .dashboard-card:hover { transform: translateY(-5px); }
                .ls-wide { letter-spacing: 0.05em; }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default MeeshoDashboard;

