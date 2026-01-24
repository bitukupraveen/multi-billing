import React, { useState, useEffect } from 'react';
import { Save, Eye } from 'lucide-react';
import type { MeeshoOrder } from '../types';

interface MeeshoOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: MeeshoOrder | null;
    onSave: (order: MeeshoOrder) => void;
    mode: 'view' | 'edit';
}

const MeeshoOrderModal: React.FC<MeeshoOrderModalProps> = ({
    isOpen,
    onClose,
    order,
    onSave,
    mode
}) => {
    const [formData, setFormData] = useState<MeeshoOrder>({
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
            shippingReturns: 0,
            forwardShippingRecovery: 0,
            totalSaleAmount: 0
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
    });

    useEffect(() => {
        if (order) {
            setFormData(order);
        }
    }, [order]);

    // Auto-calculate Bank Settlement and Profit/Loss
    useEffect(() => {
        const calculateCalculations = () => {
            const {
                revenue,
                deductions,
                settlement,
                productDetails
            } = formData;

            const status = formData.subOrderContribution;
            const gstRate = productDetails.gstRate || 0;
            const productCostTotal = productDetails.quantity * productDetails.productCost;

            let bankSettlement = 0;
            let calculatedGst = 0;
            let profitLoss = 0;

            if (status === 'Delivered') {
                // Bank Settlement = Sale Revenue - (TCS Input Credits + TDS Deduction)
                bankSettlement = revenue.saleRevenue - (settlement.tcsInputCredits + settlement.tdsDeduction);

                // GST = Total Sale Amount (extract only the GST value based on GST Rate)
                calculatedGst = ((revenue.totalSaleAmount || 0) * gstRate) / (100 + gstRate);

                // Profit/Loss = Bank Settlement - Product Cost
                profitLoss = bankSettlement - productCostTotal;
            } else if (status === 'RTO') {
                // Bank Settlement = (Sale Revenue + Shipping Revenue) - (Sales Returns + Shipping Returns)
                bankSettlement = (revenue.saleRevenue + revenue.shippingRevenue) - (revenue.salesReturns + revenue.shippingReturns);

                calculatedGst = 0;

                // Profit/Loss = Bank Settlement
                profitLoss = bankSettlement;
            } else if (status === 'Return') {
                // Bank Settlement = (Sale Revenue + Shipping Revenue) - (Sales Returns + Shipping Returns + Return Shipping Charge)
                bankSettlement = (revenue.saleRevenue + revenue.shippingRevenue) - (revenue.salesReturns + revenue.shippingReturns + deductions.returnShippingCharge);

                calculatedGst = 0;

                // Profit/Loss = Bank Settlement
                profitLoss = bankSettlement;
            }

            setFormData(prev => ({
                ...prev,
                summary: {
                    bankSettlement: Number(bankSettlement.toFixed(2)),
                    gst: Number(calculatedGst.toFixed(2)),
                    profitLoss: Number(profitLoss.toFixed(2))
                }
            }));
        };

        calculateCalculations();
    }, [
        formData.revenue.saleRevenue,
        formData.revenue.totalSaleAmount,
        formData.revenue.shippingRevenue,
        formData.revenue.salesReturns,
        formData.revenue.shippingReturns,
        formData.revenue.forwardShippingRecovery,
        formData.deductions.meeshoCommission,
        formData.deductions.warehousingFee,
        formData.deductions.shippingCharge,
        formData.deductions.returnShippingCharge,
        formData.settlement.tcsInputCredits,
        formData.settlement.tdsDeduction,
        formData.productDetails.quantity,
        formData.productDetails.productCost,
        formData.productDetails.gstRate
    ]);

    if (!isOpen || !formData) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const keys = name.split('.');

        if (keys.length === 1) {
            setFormData(prev => ({
                ...prev,
                [name]: name === 'quantity' ? Number(value) : value
            }));
        } else if (keys.length === 2) {
            const [section, field] = keys;
            setFormData(prev => ({
                ...prev,
                [section]: {
                    ...(prev[section as keyof MeeshoOrder] as object),
                    [field]: ['quantity', 'productCost', 'gstRate', 'saleRevenue', 'shippingRevenue', 'salesReturns',
                        'shippingReturns', 'forwardShippingRecovery', 'totalSaleAmount', 'meeshoCommission', 'warehousingFee', 'shippingCharge',
                        'returnShippingCharge', 'tcsInputCredits', 'tdsDeduction'].includes(field)
                        ? Number(value)
                        : value
                }
            }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const isViewMode = mode === 'view';
    const contribution = formData.subOrderContribution;
    const isDelivered = contribution === 'Delivered';
    const isRTO = contribution === 'RTO';
    const isReturn = contribution === 'Return';

    return (
        <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
            onClick={onClose}
        >
            <div
                className="bg-white rounded shadow-lg"
                style={{ width: '900px', maxHeight: '90vh', overflow: 'auto' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-3 border-bottom d-flex justify-content-between align-items-center sticky-top bg-white">
                    <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
                        {isViewMode ? <Eye size={20} className="text-primary" /> : <Save size={20} className="text-success" />}
                        {isViewMode ? 'View Meesho Order' : 'Edit Meesho Order'}
                    </h5>
                    <button onClick={onClose} className="btn-close"></button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="p-4">
                        {/* Basic Information */}
                        <h6 className="fw-bold text-primary mb-3">Basic Information</h6>
                        <div className="row g-3 mb-4">
                            <div className="col-md-3">
                                <label className="form-label fw-medium small">Channel</label>
                                <input
                                    type="text"
                                    name="channel"
                                    className="form-control form-control-sm"
                                    value={formData.channel}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-medium small">Order ID</label>
                                <input
                                    type="text"
                                    name="orderId"
                                    className="form-control form-control-sm"
                                    value={formData.orderId}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-medium small">Sub Order ID</label>
                                <input
                                    type="text"
                                    name="subOrderId"
                                    className="form-control form-control-sm"
                                    value={formData.subOrderId}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-medium small">Sub Order Contribution</label>
                                <select
                                    name="subOrderContribution"
                                    className="form-select form-select-sm"
                                    value={formData.subOrderContribution}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                >
                                    <option value="Delivered">Delivered</option>
                                    <option value="RTO">RTO</option>
                                    <option value="Return">Return</option>
                                </select>
                            </div>
                        </div>

                        {/* Payment Status (Dates) */}
                        <h6 className="fw-bold text-primary mb-3">Payment Status</h6>
                        <div className="row g-3 mb-4">
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">Ordered Date</label>
                                <input
                                    type="date"
                                    name="paymentStatus.ordered"
                                    className="form-control form-control-sm"
                                    value={formData.paymentStatus.ordered}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">Shipped Date</label>
                                <input
                                    type="date"
                                    name="paymentStatus.shipped"
                                    className="form-control form-control-sm"
                                    value={formData.paymentStatus.shipped}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            {!isRTO && (
                                <div className="col-md-4">
                                    <label className="form-label fw-medium small">Delivered Date</label>
                                    <input
                                        type="date"
                                        name="paymentStatus.delivered"
                                        className="form-control form-control-sm"
                                        value={formData.paymentStatus.delivered}
                                        onChange={handleChange}
                                        disabled={isViewMode}
                                    />
                                </div>
                            )}
                            {!(isDelivered || isRTO) && (
                                <div className="col-md-4">
                                    <label className="form-label fw-medium small">Returned Date</label>
                                    <input
                                        type="date"
                                        name="paymentStatus.returned"
                                        className="form-control form-control-sm"
                                        value={formData.paymentStatus.returned}
                                        onChange={handleChange}
                                        disabled={isViewMode}
                                    />
                                </div>
                            )}
                            {!(isDelivered || isReturn) && (
                                <div className="col-md-4">
                                    <label className="form-label fw-medium small">RTO Date</label>
                                    <input
                                        type="date"
                                        name="paymentStatus.rto"
                                        className="form-control form-control-sm"
                                        value={formData.paymentStatus.rto}
                                        onChange={handleChange}
                                        disabled={isViewMode}
                                    />
                                </div>
                            )}
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">Payment Paid Date</label>
                                <input
                                    type="date"
                                    name="paymentStatus.paymentPaid"
                                    className="form-control form-control-sm"
                                    value={formData.paymentStatus.paymentPaid}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                        </div>

                        {/* Product Details */}
                        <h6 className="fw-bold text-primary mb-3">Product Details</h6>
                        <div className="row g-3 mb-4">
                            <div className="col-md-6">
                                <label className="form-label fw-medium small">Product Name</label>
                                <input
                                    type="text"
                                    name="productDetails.productName"
                                    className="form-control form-control-sm"
                                    value={formData.productDetails.productName}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-medium small">SKU Code</label>
                                <input
                                    type="text"
                                    name="productDetails.skuCode"
                                    className="form-control form-control-sm"
                                    value={formData.productDetails.skuCode}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-medium small">HSN Code</label>
                                <input
                                    type="text"
                                    name="productDetails.hsnCode"
                                    className="form-control form-control-sm"
                                    value={formData.productDetails.hsnCode}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-medium small">Quantity</label>
                                <input
                                    type="number"
                                    name="productDetails.quantity"
                                    className="form-control form-control-sm"
                                    value={formData.productDetails.quantity}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-medium small">Product Cost (₹)</label>
                                <input
                                    type="number"
                                    name="productDetails.productCost"
                                    className="form-control form-control-sm"
                                    value={formData.productDetails.productCost}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-medium small">GST Rate (%)</label>
                                <select
                                    name="productDetails.gstRate"
                                    className="form-select form-select-sm"
                                    value={formData.productDetails.gstRate}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                >
                                    <option value="0">0%</option>
                                    <option value="5">5%</option>
                                    <option value="12">12%</option>
                                    <option value="18">18%</option>
                                    <option value="28">28%</option>
                                </select>
                            </div>
                        </div>

                        {/* Total Revenue */}
                        <h6 className="fw-bold text-primary mb-3">Total Revenue (Incl. GST)</h6>
                        <div className="row g-3 mb-4">

                            <div className="col-md-3">
                                <label className="form-label fw-medium small">Total Sale Amount (₹)</label>
                                <input
                                    type="number"
                                    name="revenue.totalSaleAmount"
                                    className="form-control form-control-sm"
                                    value={formData.revenue.totalSaleAmount || 0}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-medium small">Sale Revenue (₹)</label>
                                <input
                                    type="number"
                                    name="revenue.saleRevenue"
                                    className="form-control form-control-sm"
                                    value={formData.revenue.saleRevenue}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-medium small">Shipping Revenue (₹)</label>
                                <input
                                    type="number"
                                    name="revenue.shippingRevenue"
                                    className="form-control form-control-sm"
                                    value={formData.revenue.shippingRevenue}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            {!isDelivered && (
                                <div className="col-md-3">
                                    <label className="form-label fw-medium small">Sales Returns (₹)</label>
                                    <input
                                        type="number"
                                        name="revenue.salesReturns"
                                        className="form-control form-control-sm"
                                        value={formData.revenue.salesReturns}
                                        onChange={handleChange}
                                        disabled={isViewMode}
                                    />
                                </div>
                            )}
                            {!isDelivered && (
                                <div className="col-md-3">
                                    <label className="form-label fw-medium small">Shipping Returns (₹)</label>
                                    <input
                                        type="number"
                                        name="revenue.shippingReturns"
                                        className="form-control form-control-sm"
                                        value={formData.revenue.shippingReturns}
                                        onChange={handleChange}
                                        disabled={isViewMode}
                                    />
                                </div>
                            )}
                            {!isReturn && (
                                <div className="col-md-3">
                                    <label className="form-label fw-medium small">Forward Shipping Recovery (₹)</label>
                                    <input
                                        type="number"
                                        name="revenue.forwardShippingRecovery"
                                        className="form-control form-control-sm"
                                        value={formData.revenue.forwardShippingRecovery}
                                        onChange={handleChange}
                                        disabled={isViewMode}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Deductions */}
                        <h6 className="fw-bold text-primary mb-3">Deductions</h6>
                        <div className="row g-3 mb-4">
                            <div className="col-md-3">
                                <label className="form-label fw-medium small">Meesho Commission (₹)</label>
                                <input
                                    type="number"
                                    name="deductions.meeshoCommission"
                                    className="form-control form-control-sm"
                                    value={formData.deductions.meeshoCommission}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-medium small">Warehousing Fee (₹)</label>
                                <input
                                    type="number"
                                    name="deductions.warehousingFee"
                                    className="form-control form-control-sm"
                                    value={formData.deductions.warehousingFee}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-medium small">Shipping Charge (₹)</label>
                                <input
                                    type="number"
                                    name="deductions.shippingCharge"
                                    className="form-control form-control-sm"
                                    value={formData.deductions.shippingCharge}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            {!(isDelivered || isRTO) && (
                                <div className="col-md-3">
                                    <label className="form-label fw-medium small">Return Shipping Charge (₹)</label>
                                    <input
                                        type="number"
                                        name="deductions.returnShippingCharge"
                                        className="form-control form-control-sm"
                                        value={formData.deductions.returnShippingCharge}
                                        onChange={handleChange}
                                        disabled={isViewMode}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Net Settlement */}
                        <h6 className="fw-bold text-primary mb-3">Net Settlement (Incl. GST)</h6>
                        <div className="row g-3 mb-4">
                            {!(isRTO || isReturn) && (
                                <div className="col-md-6">
                                    <label className="form-label fw-medium small">TCS Input Credits (₹)</label>
                                    <input
                                        type="number"
                                        name="settlement.tcsInputCredits"
                                        className="form-control form-control-sm"
                                        value={formData.settlement.tcsInputCredits}
                                        onChange={handleChange}
                                        disabled={isViewMode}
                                    />
                                </div>
                            )}
                            {!(isRTO || isReturn) && (
                                <div className="col-md-6">
                                    <label className="form-label fw-medium small">TDS Deduction (₹)</label>
                                    <input
                                        type="number"
                                        name="settlement.tdsDeduction"
                                        className="form-control form-control-sm"
                                        value={formData.settlement.tdsDeduction}
                                        onChange={handleChange}
                                        disabled={isViewMode}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Summary */}
                        <h6 className="fw-bold text-primary mb-3">Summary</h6>
                        <div className="row g-3">
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">Bank Settlement (₹)</label>
                                <input
                                    type="number"
                                    name="summary.bankSettlement"
                                    className={`form-control form-control-sm fw-bold ${formData.summary.bankSettlement >= 0 ? 'text-success' : 'text-danger'}`}
                                    value={formData.summary.bankSettlement}
                                    readOnly
                                    style={{ backgroundColor: '#f8f9fa' }}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">GST Amount (₹)</label>
                                <input
                                    type="number"
                                    name="summary.gst"
                                    className="form-control form-control-sm fw-bold text-primary"
                                    value={formData.summary.gst}
                                    readOnly
                                    style={{ backgroundColor: '#f8f9fa' }}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">Profit/Loss (₹)</label>
                                <input
                                    type="number"
                                    name="summary.profitLoss"
                                    className={`form-control form-control-sm fw-bold ${formData.summary.profitLoss >= 0 ? 'text-success' : 'text-danger'}`}
                                    value={formData.summary.profitLoss}
                                    readOnly
                                    style={{ backgroundColor: '#f8f9fa' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-top d-flex justify-content-end gap-2 bg-light sticky-bottom">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary"
                        >
                            {isViewMode ? 'Close' : 'Cancel'}
                        </button>
                        {!isViewMode && (
                            <button
                                type="submit"
                                className="btn btn-primary d-flex align-items-center gap-2"
                            >
                                <Save size={18} />
                                Save Changes
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MeeshoOrderModal;
