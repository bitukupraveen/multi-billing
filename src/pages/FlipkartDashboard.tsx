import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileSpreadsheet,
    TrendingUp,
    DollarSign,
    Percent,
    ShoppingBag,
    ShieldCheck,
    ArrowRight,
    Loader2,
    AlertTriangle,
    Activity
} from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import type { FlipkartOrder, FlipkartGSTReportRecord, FlipkartCashBackReportRecord } from '../types';

const FlipkartDashboard: React.FC = () => {
    const navigate = useNavigate();

    const { data: orders, loading: ordersLoading } = useFirestore<FlipkartOrder>('flipkartOrders');
    const { data: gstReports, loading: gstLoading } = useFirestore<FlipkartGSTReportRecord>('flipkartGstReports');
    const { data: cashBackReports, loading: cashBackLoading } = useFirestore<FlipkartCashBackReportRecord>('flipkartCashBackReports');

    const loading = ordersLoading || gstLoading || cashBackLoading;

    const analysis = useMemo(() => {
        if (!orders.length && !gstReports.length && !cashBackReports.length && !loading) return null;

        const stats = {
            totalSales: 0,
            netProfit: 0,
            bankSettlement: 0,
            gstLiability: 0,
            tcsRecoverable: 0,
            orderCount: orders.length,
            gstReportCount: gstReports.length,
            cashbackCount: cashBackReports.length,
            // Gap Analysis
            orderSalesTotal: 0,
            gstInvoiceTotal: 0,
            settlementGap: 0,
            // Fee Breakdown
            totalFees: 0,
            fees: {
                commission: 0,
                fixed: 0,
                collection: 0,
                shipping: 0,
                reverseShipping: 0,
                others: 0
            },
            // Tax Breakdown
            totalTaxDeductions: 0,
            taxes: {
                tcs: 0,
                tds: 0,
                gstOnMpFees: 0
            }
        };

        orders.forEach(o => {
            const s = (o.totalSaleAmount || o.saleAmount || 0);
            stats.orderSalesTotal += s;
            stats.netProfit += (o.profitLoss || 0);
            stats.bankSettlement += (o.bankSettlementValue || 0);

            // Fees Breakdown
            stats.fees.commission += (o.commission || 0);
            stats.fees.fixed += (o.fixedFee || 0);
            stats.fees.collection += (o.collectionFee || 0);
            stats.fees.shipping += (o.shippingFee || 0);
            stats.fees.reverseShipping += (o.reverseShippingFee || 0);

            const otherFees = (o.pickAndPackFee || 0) + (o.installationFee || 0) +
                (o.techVisitFee || 0) + (o.uninstallationPackagingFee || 0) +
                (o.franchiseFee || 0) + (o.shopsyMarketingFee || 0);
            stats.fees.others += otherFees;
            stats.totalFees += (o.marketplaceFee || 0);

            // Tax Breakdown from order records
            stats.taxes.tcs += (o.tcs || 0);
            stats.taxes.tds += (o.tds || 0);
            stats.taxes.gstOnMpFees += (o.gstOnMpFees || 0);
            stats.totalTaxDeductions += (o.taxes || 0);
        });

        gstReports.forEach(g => {
            stats.gstInvoiceTotal += (g.finalInvoiceAmount || 0);
            stats.gstLiability += (g.igstAmount || 0) + (g.cgstAmount || 0) + (g.sgstAmount || 0);
        });

        cashBackReports.forEach(c => {
            stats.tcsRecoverable += (c.totalTcsDeducted || 0);
        });

        stats.totalSales = Math.max(stats.orderSalesTotal, stats.gstInvoiceTotal);
        stats.settlementGap = Math.max(0, stats.totalSales - stats.bankSettlement);

        return stats;
    }, [orders, gstReports, cashBackReports, loading]);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100 flex-column gap-3">
                <Loader2 size={48} className="animate-spin text-primary" />
                <h5 className="text-secondary fw-semibold">Decrypting Flipkart Intelligence...</h5>
            </div>
        );
    }

    if (!analysis) {
        return (
            <div className="container-fluid py-5 text-center">
                <div className="max-w-md mx-auto py-5">
                    <Activity size={80} className="text-muted mb-4 opacity-25 mx-auto" />
                    <h2 className="fw-bold text-dark mb-3">No Flipkart Data Found</h2>
                    <p className="text-secondary mb-5">Please upload your Flipkart Order, GST, or Cashback reports to start the deep analysis.</p>
                    <button className="btn btn-primary px-5 py-3 rounded-pill shadow" onClick={() => navigate('/flipkart-report')}>
                        Go to Upload Section
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
            {/* Header */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-5 gap-3">
                <div>
                    <h1 className="display-5 fw-bold text-dark mb-1">Flipkart <span className="text-primary">Intelligence</span></h1>
                    <p className="text-secondary mb-0 fw-medium">Deep dive into order profitability and tax reconciliation</p>
                </div>
                <div className="bg-white p-2 rounded-4 shadow-sm border d-flex gap-3 align-items-center px-3" style={{ height: '48px' }}>
                    <div className="d-flex align-items-center gap-2 border-end pe-3 h-100">
                        <div className="bg-primary rounded-circle animate-pulse" style={{ width: '8px', height: '8px' }}></div>
                        <span className="small fw-bold text-dark text-nowrap" style={{ lineHeight: 1 }}>Flipkart Stream</span>
                    </div>
                    <div className="d-flex align-items-center justify-content-center h-100">
                        <Activity className="text-primary" size={20} />
                    </div>
                </div>
            </div>

            {/* Top Metrics */}
            <div className="row g-4 mb-5">
                <div className="col-lg-3 col-md-6">
                    <MetricCard title="Gross Sales" value={analysis.totalSales} icon={ShoppingBag} gradient="gradient-primary" detail={`${analysis.orderCount} Orders Processed`} />
                </div>
                <div className="col-lg-3 col-md-6">
                    <MetricCard title="Net Profit" value={analysis.netProfit} icon={TrendingUp} gradient="gradient-success" detail={`Margin: ${((analysis.netProfit / (analysis.totalSales || 1)) * 100).toFixed(1)}%`} />
                </div>
                <div className="col-lg-3 col-md-6">
                    <MetricCard title="Marketplace Fees" value={analysis.totalFees} icon={DollarSign} gradient="gradient-danger" detail={`Tax deducted: ${formatINR(analysis.totalTaxDeductions)}`} />
                </div>
                <div className="col-lg-3 col-md-6">
                    <MetricCard title="Bank Settlement" value={analysis.bankSettlement} icon={ShieldCheck} gradient="gradient-info" detail={`Recovery: ${((analysis.bankSettlement / (analysis.totalSales || 1)) * 100).toFixed(1)}%`} />
                </div>
            </div>

            <div className="row g-4 mb-5">
                {/* Fee Breakdown */}
                <div className="col-xl-4 col-lg-6">
                    <div className="card dashboard-card border-0 shadow-sm h-100 glass-card">
                        <div className="card-header bg-transparent border-0 p-4 pb-0">
                            <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                                <Percent size={20} className="text-primary" />
                                Fee Analysis
                            </h5>
                        </div>
                        <div className="card-body p-4">
                            <div className="d-flex flex-column gap-3">
                                {[
                                    { label: 'Commission', value: analysis.fees.commission, color: '#4e73df' },
                                    { label: 'Shipping Fee', value: analysis.fees.shipping, color: '#1cc88a' },
                                    { label: 'Collection Fee', value: analysis.fees.collection, color: '#36b9cc' },
                                    { label: 'Fixed Fee', value: analysis.fees.fixed, color: '#f6c23e' },
                                    { label: 'Reverse Shipping', value: analysis.fees.reverseShipping, color: '#e74a3b' },
                                    { label: 'Other Fees', value: analysis.fees.others, color: '#858796' }
                                ].map((fee, idx) => (
                                    <div key={idx}>
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <span className="small fw-bold text-muted">{fee.label}</span>
                                            <span className="fw-bold">{formatINR(fee.value)}</span>
                                        </div>
                                        <div className="progress" style={{ height: '4px' }}>
                                            <div className="progress-bar" style={{
                                                width: `${(fee.value / (analysis.totalFees || 1)) * 100}%`,
                                                backgroundColor: fee.color
                                            }}></div>
                                        </div>
                                    </div>
                                ))}
                                <div className="mt-2 p-3 rounded bg-light border-white border text-center">
                                    <h6 className="text-uppercase small fw-bold text-muted mb-1">Total Fee Impact</h6>
                                    <h4 className="fw-bold text-danger mb-0">{((analysis.totalFees / (analysis.totalSales || 1)) * 100).toFixed(1)}%</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tax & Reconciliation */}
                <div className="col-xl-4 col-lg-6">
                    <div className="card dashboard-card border-0 shadow-sm h-100 glass-card">
                        <div className="card-header bg-transparent border-0 p-4 pb-0">
                            <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                                <ShieldCheck size={20} className="text-success" />
                                Tax & Reconciliation
                            </h5>
                        </div>
                        <div className="card-body p-4">
                            <div className="d-flex flex-column gap-4">
                                <div className="p-3 rounded-4 bg-primary bg-opacity-10 border-primary border-opacity-10 border">
                                    <div className="small fw-bold text-primary text-uppercase mb-1">GST Liability (Orders)</div>
                                    <h3 className="fw-bold text-primary mb-0">{formatINR(analysis.gstLiability)}</h3>
                                    <div className="small text-primary opacity-75 mt-1">Based on GST Report Sync</div>
                                </div>

                                <div className="row g-3">
                                    <div className="col-6">
                                        <div className="p-3 rounded bg-light border-white border">
                                            <div className="small text-muted mb-1">TCS Deducted</div>
                                            <h5 className="fw-bold mb-0">{formatINR(analysis.taxes.tcs)}</h5>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="p-3 rounded bg-light border-white border">
                                            <div className="small text-muted mb-1">TDS Deducted</div>
                                            <h5 className="fw-bold mb-0">{formatINR(analysis.taxes.tds)}</h5>
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        <div className="p-3 rounded bg-light border-white border d-flex justify-content-between align-items-center">
                                            <div className="small text-muted font-bold">GST on MP Fees</div>
                                            <h5 className="fw-bold mb-0 text-danger">{formatINR(analysis.taxes.gstOnMpFees)}</h5>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-center p-2 rounded-lg bg-success bg-opacity-10 border border-success border-opacity-10">
                                    <div className="small text-success fw-bold">TCS Recoverable (Cashback)</div>
                                    <h5 className="fw-bold text-success mb-0">{formatINR(analysis.tcsRecoverable)}</h5>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Settlement Gap Analysis */}
                <div className="col-xl-4 col-lg-12">
                    <div className="card dashboard-card border-0 shadow-sm h-100 glass-card">
                        <div className="card-header bg-transparent border-0 p-4 pb-0">
                            <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                                <AlertTriangle size={20} className="text-warning" />
                                Settlement Gap
                            </h5>
                        </div>
                        <div className="card-body p-4">
                            <div className="text-center mb-4">
                                <h6 className="text-uppercase small fw-bold text-muted mb-2">Inventory Value vs Settlement</h6>
                                <h2 className="display-6 fw-bold text-dark">{formatINR(analysis.totalSales)}</h2>
                                <div className="text-success fw-bold small">Settled: {formatINR(analysis.bankSettlement)}</div>
                            </div>

                            <div className="bg-danger bg-opacity-10 p-4 rounded-4 border-danger border-opacity-10 border transition-all">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div>
                                        <h6 className="fw-bold text-danger mb-1">Untracked Gap</h6>
                                        <p className="small text-danger opacity-75 mb-0">Unsettled or pending revenue</p>
                                    </div>
                                    <h2 className="fw-bold text-danger mb-0">{formatINR(analysis.settlementGap)}</h2>
                                </div>
                                <div className="progress rounded-pill bg-white" style={{ height: '10px' }}>
                                    <div className="progress-bar bg-danger" style={{ width: `${(analysis.settlementGap / (analysis.totalSales || 1)) * 100}%` }}></div>
                                </div>
                                <div className="mt-2 small text-danger text-end fw-bold">
                                    {((analysis.settlementGap / (analysis.totalSales || 1)) * 100).toFixed(1)}% revenue impact
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                {/* Quick Actions / Report Links */}
                <div className="col-xl-4">
                    <div className="card dashboard-card border-0 shadow-sm h-100 overflow-hidden">
                        <div className="card-header bg-white border-0 p-4 pb-0">
                            <h5 className="fw-bold mb-0">Analytics Depth</h5>
                        </div>
                        <div className="card-body p-4">
                            <div className="d-flex flex-column gap-3">
                                {[
                                    { name: 'Order Report', icon: FileSpreadsheet, path: '/flipkart-report', color: 'primary', count: analysis.orderCount },
                                    { name: 'GST Report', icon: TrendingUp, path: '/flipkart-gst-report', color: 'indigo', count: analysis.gstReportCount },
                                    { name: 'Cashback Report', icon: DollarSign, path: '/flipkart-cashback-report', color: 'success', count: analysis.cashbackCount }
                                ].map((report, idx) => (
                                    <div key={idx} className="d-flex align-items-center justify-content-between p-3 rounded-4 bg-light cursor-pointer hover-scale transition-all border border-white shadow-sm" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }} onClick={() => navigate(report.path)}>
                                        <div className="d-flex align-items-center gap-3">
                                            <div className={`bg-${report.color} text-white rounded-lg d-flex align-items-center justify-content-center shadow-sm`} style={{ width: '40px', height: '40px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                <report.icon size={20} />
                                            </div>
                                            <div>
                                                <div className="fw-bold text-dark">{report.name}</div>
                                                <div className="small text-muted">{report.count} records analyzed</div>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center bg-white rounded-circle p-1 shadow-sm">
                                            <ArrowRight size={16} className="text-muted" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .glass-card { background: rgba(255,255,255,0.7); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3); }
                .hover-scale:hover { transform: scale(1.02); }
                .rounded-lg { border-radius: 0.75rem; }
                .ls-wide { letter-spacing: 0.05em; }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default FlipkartDashboard;
