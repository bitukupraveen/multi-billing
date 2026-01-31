import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    FileSpreadsheet,
    TrendingUp,
    DollarSign,
    Percent,
    ShoppingBag,
    ShieldCheck,
    ArrowRight,
    BarChart3,
    PieChart,
    ArrowUpRight,
    Loader2
} from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import type { FlipkartOrder, FlipkartGSTReportRecord, FlipkartCashBackReportRecord } from '../types';

const FlipkartDashboard: React.FC = () => {
    const navigate = useNavigate();

    // Fetch data from all 3 Flipkart collections
    const { data: orders, loading: ordersLoading } = useFirestore<FlipkartOrder>('flipkartOrders');
    const { data: gstReports, loading: gstLoading } = useFirestore<FlipkartGSTReportRecord>('flipkartGstReports');
    const { data: cashBackReports, loading: cashBackLoading } = useFirestore<FlipkartCashBackReportRecord>('flipkartCashBackReports');

    const loading = ordersLoading || gstLoading || cashBackLoading;

    // Aggregate Metrics
    const metrics = useMemo(() => {
        const stats = {
            orders: {
                total: orders.length,
                profit: 0,
                settlement: 0,
                sales: 0
            },
            gst: {
                totalReports: gstReports.length,
                taxableValue: 0,
                netGst: 0,
                totalSales: 0
            },
            cashback: {
                totalReports: cashBackReports.length,
                invoiceAmount: 0,
                totalTcs: 0,
                totalGst: 0
            }
        };

        // Orders metrics
        orders.forEach(o => {
            stats.orders.profit += (o.profitLoss || 0);
            stats.orders.settlement += (o.bankSettlement || 0);
            stats.orders.sales += (o.sellerPrice || 0);
        });

        // GST metrics
        gstReports.forEach(g => {
            stats.gst.taxableValue += (g.taxableValue || 0);
            stats.gst.netGst += (g.igstAmount || 0) + (g.cgstAmount || 0) + (g.sgstAmount || 0);
            stats.gst.totalSales += (g.finalInvoiceAmount || 0);
        });

        // Cash Back metrics
        cashBackReports.forEach(c => {
            stats.cashback.invoiceAmount += (c.invoiceAmount || 0);
            stats.cashback.totalTcs += (c.totalTcsDeducted || 0);
            stats.cashback.totalGst += (c.igstAmount || 0) + (c.cgstAmount || 0) + (c.sgstAmount || 0);
        });

        return stats;
    }, [orders, gstReports, cashBackReports]);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100 flex-column gap-3">
                <Loader2 size={48} className="animate-spin text-primary" />
                <h5 className="text-secondary fw-semibold">Loading Dashboard Intelligence...</h5>
            </div>
        );
    }

    const QuickActionCard = ({ title, desc, icon: Icon, path, color, metrics: cardMetrics }: any) => (
        <div
            className="card border-0 shadow-sm h-100 cursor-pointer overflow-hidden transition-all hover-translate-y"
            onClick={() => navigate(path)}
            style={{ borderRadius: '1.25rem' }}
        >
            <div className={`p-4 bg-gradient-${color} text-white d-flex align-items-center justify-content-between`}>
                <div className="d-flex align-items-center gap-3">
                    <div className="bg-white bg-opacity-25 p-2 rounded-lg">
                        <Icon size={24} />
                    </div>
                    <h5 className="mb-0 fw-bold">{title}</h5>
                </div>
                <ArrowUpRight size={20} className="opacity-75" />
            </div>
            <div className="card-body p-4">
                <p className="text-secondary small mb-4">{desc}</p>
                <div className="row g-3">
                    {cardMetrics.map((m: any, idx: number) => (
                        <div key={idx} className="col-6">
                            <div className="small text-uppercase text-muted fw-bold mb-1" style={{ fontSize: '0.65rem' }}>{m.label}</div>
                            <div className="h5 fw-bold mb-0">₹{m.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="card-footer bg-white border-0 p-4 pt-0">
                <button className="btn btn-outline-primary w-100 rounded-pill d-flex align-items-center justify-content-center gap-2 py-2">
                    View Report <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-end mb-5">
                <div>
                    <div className="d-flex align-items-center gap-3 mb-1">
                        <LayoutDashboard className="text-primary" size={32} />
                        <h2 className="display-6 fw-bold text-gray-800 mb-0">Flipkart Dashboard</h2>
                    </div>
                    <p className="text-secondary mb-0">Automated insights across Orders, Taxes, and Cashbacks</p>
                </div>
                <div className="bg-white p-2 rounded-4 shadow-sm border d-flex gap-2">
                    <BarChart3 className="text-primary" />
                    <span className="small fw-bold">Live Update</span>
                </div>
            </div>

            {/* High Level Stats Overview */}
            <div className="row g-4 mb-5">
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm p-4 h-100 bg-white" style={{ borderRadius: '1.25rem' }}>
                        <div className="d-flex align-items-center gap-3 mb-3">
                            <div className="bg-primary-subtle p-3 rounded-4 text-primary">
                                <ShoppingBag size={24} />
                            </div>
                            <div className="h3 mb-0 fw-bold">{metrics.orders.total}</div>
                        </div>
                        <h6 className="text-secondary fw-semibold mb-0">Total Orders</h6>
                        <div className="mt-3 small text-success d-flex align-items-center gap-1">
                            <TrendingUp size={14} /> <span>Across all channels</span>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm p-4 h-100 bg-white" style={{ borderRadius: '1.25rem' }}>
                        <div className="d-flex align-items-center gap-3 mb-3">
                            <div className="bg-success-subtle p-3 rounded-4 text-success">
                                <DollarSign size={24} />
                            </div>
                            <div className="h3 mb-0 fw-bold">₹{metrics.orders.profit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                        </div>
                        <h6 className="text-secondary fw-semibold mb-0">Net Order Profit</h6>
                        <div className="mt-3 small text-muted">Estimated P&L</div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm p-4 h-100 bg-white" style={{ borderRadius: '1.25rem' }}>
                        <div className="d-flex align-items-center gap-3 mb-3">
                            <div className="bg-info-subtle p-3 rounded-4 text-info">
                                <ShieldCheck size={24} />
                            </div>
                            <div className="h3 mb-0 fw-bold">₹{metrics.gst.netGst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                        </div>
                        <h6 className="text-secondary fw-semibold mb-0">Net GST Liability</h6>
                        <div className="mt-3 small text-muted">Total output tax</div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm p-4 h-100 bg-white" style={{ borderRadius: '1.25rem' }}>
                        <div className="d-flex align-items-center gap-3 mb-3">
                            <div className="bg-warning-subtle p-3 rounded-4 text-warning">
                                <Percent size={24} />
                            </div>
                            <div className="h3 mb-0 fw-bold">₹{metrics.cashback.totalTcs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                        </div>
                        <h6 className="text-secondary fw-semibold mb-0">Total TCS Recoverable</h6>
                        <div className="mt-3 small text-muted">Deducted at source</div>
                    </div>
                </div>
            </div>

            {/* Detail Report Sections */}
            <h4 className="fw-bold mb-4 d-flex align-items-center gap-2">
                <PieChart size={24} className="text-primary" />
                Detail Analysis Reports
            </h4>
            <div className="row g-4">
                <div className="col-lg-4">
                    <QuickActionCard
                        title="Order Report"
                        desc="Daily sales tracking, logistics, and profit/loss calculation per order item."
                        icon={FileSpreadsheet}
                        path="/flipkart-report"
                        color="blue"
                        metrics={[
                            { label: 'Avg Sale', value: metrics.orders.total > 0 ? metrics.orders.sales / metrics.orders.total : 0 },
                            { label: 'Settlement', value: metrics.orders.settlement }
                        ]}
                    />
                </div>
                <div className="col-lg-4">
                    <QuickActionCard
                        title="GST Report"
                        desc="Consolidated GST filing data for HSN, taxable values, and item-wise breakdown."
                        icon={TrendingUp}
                        path="/flipkart-gst-report"
                        color="indigo"
                        metrics={[
                            { label: 'Taxable Val', value: metrics.gst.taxableValue },
                            { label: 'Total Sales', value: metrics.gst.totalSales }
                        ]}
                    />
                </div>
                <div className="col-lg-4">
                    <QuickActionCard
                        title="Cash Back Report"
                        desc="Cashback management, credit/debit notes, and TCS/TDS reconciliation."
                        icon={DollarSign}
                        path="/flipkart-cashback-report"
                        color="success"
                        metrics={[
                            { label: 'Invoice Amt', value: metrics.cashback.invoiceAmount },
                            { label: 'Total GST', value: metrics.cashback.totalGst }
                        ]}
                    />
                </div>
            </div>

            <style>{`
                .hover-translate-y:hover {
                    transform: translateY(-5px);
                }
                .bg-gradient-blue { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
                .bg-gradient-indigo { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); }
                .bg-gradient-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
                .transition-all { transition: all 0.3s ease; }
                .rounded-lg { border-radius: 0.75rem; }
            `}</style>
        </div>
    );
};

export default FlipkartDashboard;
