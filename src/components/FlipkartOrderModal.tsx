import React, { useState, useEffect } from 'react';
import { Save, Eye } from 'lucide-react';
import type { FlipkartOrder } from '../types';

interface FlipkartOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: FlipkartOrder | null;
    onSave: (order: FlipkartOrder) => void;
    mode: 'view' | 'edit';
}

const FlipkartOrderModal: React.FC<FlipkartOrderModalProps> = ({
    isOpen,
    onClose,
    order,
    onSave,
    mode
}) => {
    const [formData, setFormData] = useState<FlipkartOrder>({
        channel: 'Flipkart',
        orderId: '',
        orderItemId: '',
        dispatchedDate: '',
        paymentDate: '',
        sku: '',
        quantity: 0,
        paymentMode: 'Prepaid',
        hsnCode: '',
        fromState: 'IN-TS',
        toState: '',
        orderItemValue: 0,
        customerLogisticsFee: 0,
        sellerPrice: 0,
        marketplaceFees: 0,
        gstOnFees: 0,
        productCost: 0,
        bankSettlement: 0,
        inputGstCredit: 0,
        tdsCredit: 0,
        deliveryStatus: 'Sale',
        returnProductStatus: 'Working',
        refundAmount: 0,
        totalDiscount: 0,
        profitLoss: 0,
        uploadDate: new Date().toISOString()
    });

    useEffect(() => {
        if (order) {
            setFormData(order);
        }
    }, [order]);

    // Auto-calculate Profit/Loss based on delivery status or settlement data
    useEffect(() => {
        const calculateProfitLoss = () => {
            const {
                deliveryStatus,
                sellerPrice = 0,
                marketplaceFees = 0,
                gstOnFees = 0,
                refundAmount = 0,
                customerLogisticsFee = 0,
                orderItemValue = 0,
                productCost = 0,
                inputGstCredit = 0,
                tdsCredit = 0,
                returnProductStatus = "Working",
                totalDiscount = 0,
                quantity = 0
            } = formData;

            let profitLoss = 0;
            let bankSettlement = 0;
            let productCostQuantity = (quantity * productCost);

            // Base settlement = Seller Price - (Marketplace Fees + GST on Fees)
            // bankSettlement = sellerPrice - (marketplaceFees + gstOnFees);
            // profitLoss = bankSettlement - productCost;
            if (deliveryStatus === 'Sale') {
                // Delivered P/L = Settlement - Product Cost
                bankSettlement = (sellerPrice + totalDiscount) - (marketplaceFees + gstOnFees);
                profitLoss = bankSettlement - productCostQuantity;
            } else if (deliveryStatus === 'CustomerReturn' || deliveryStatus === 'LogisticsReturn') {
                // Returned P/L = Settlement - Product Cost - Refund Amount - Customer Logistics Fee
                bankSettlement = (orderItemValue) - (totalDiscount + refundAmount + customerLogisticsFee + marketplaceFees + inputGstCredit + tdsCredit);
                if (returnProductStatus === "Working") {
                    profitLoss = bankSettlement;
                } else {
                    profitLoss = bankSettlement - productCostQuantity;
                }
                if (deliveryStatus === 'LogisticsReturn') {
                    bankSettlement = (sellerPrice) - (refundAmount + marketplaceFees + gstOnFees);
                    profitLoss = bankSettlement;
                }
            } else if (deliveryStatus === 'Cancellation') {
                // Cancellation P/L = Order Item Value - Customer Logistics Fee
                bankSettlement = orderItemValue - (sellerPrice + customerLogisticsFee);
                profitLoss = bankSettlement;
                //bankSettlement = sellerPrice - (marketplaceFees + gstOnFees);
            }

            setFormData(prev => ({
                ...prev,
                profitLoss: Number(profitLoss.toFixed(2)),
                bankSettlement: Number(bankSettlement.toFixed(2))
            }));
        };

        calculateProfitLoss();
    }, [
        formData.deliveryStatus,
        formData.sellerPrice,
        formData.marketplaceFees,
        formData.gstOnFees,
        formData.refundAmount,
        formData.customerLogisticsFee,
        formData.orderItemValue,
        formData.productCost,
        formData.bankSettlement,
        formData.inputGstCredit,
        formData.tdsCredit,
        formData.returnProductStatus,
        formData.totalDiscount
    ]);

    if (!isOpen || !order) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: ['quantity', 'orderItemValue', 'customerLogisticsFee', 'sellerPrice',
                'marketplaceFees', 'gstOnFees', 'productCost', 'bankSettlement', 'inputGstCredit',
                'tdsCredit', 'refundAmount', 'totalDiscount', 'profitLoss'].includes(name)
                ? Number(value)
                : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const isViewMode = mode === 'view';

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
                        {isViewMode ? 'View Order Details' : 'Edit Order'}
                    </h5>
                    <button onClick={onClose} className="btn-close"></button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="p-4">
                        {/* Order Information */}
                        <h6 className="fw-bold text-primary mb-3">Order Information</h6>
                        <div className="row g-3 mb-4">
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">Channel</label>
                                <input
                                    type="text"
                                    name="channel"
                                    className="form-control form-control-sm"
                                    value={formData.channel || 'Flipkart'}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">Order ID</label>
                                <input
                                    type="text"
                                    name="orderId"
                                    className="form-control form-control-sm"
                                    value={formData.orderId || ''}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">Order Item ID</label>
                                <input
                                    type="text"
                                    name="orderItemId"
                                    className="form-control form-control-sm"
                                    value={formData.orderItemId || ''}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">Dispatched Date</label>
                                <input
                                    type="date"
                                    name="dispatchedDate"
                                    className="form-control form-control-sm"
                                    value={formData.dispatchedDate || ''}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">Payment Date</label>
                                <input
                                    type="date"
                                    name="paymentDate"
                                    className="form-control form-control-sm"
                                    value={formData.paymentDate || ''}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">Payment Mode</label>
                                <select
                                    name="paymentMode"
                                    className="form-select form-select-sm"
                                    value={formData.paymentMode || 'Prepaid'}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                >
                                    <option value="Prepaid">Prepaid</option>
                                    <option value="Postpaid">Postpaid</option>
                                </select>
                            </div>
                        </div>

                        {/* Product Information */}
                        <h6 className="fw-bold text-primary mb-3">Product Information</h6>
                        <div className="row g-3 mb-4">
                            <div className="col-md-6">
                                <label className="form-label fw-medium small">SKU</label>
                                <input
                                    type="text"
                                    name="sku"
                                    className="form-control form-control-sm"
                                    value={formData.sku || ''}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-medium small">Quantity</label>
                                <input
                                    type="number"
                                    name="quantity"
                                    className="form-control form-control-sm"
                                    value={formData.quantity || 0}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-medium small">HSN Code</label>
                                <input
                                    type="text"
                                    name="hsnCode"
                                    className="form-control form-control-sm"
                                    value={formData.hsnCode || ''}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                        </div>

                        {/* Logistics Information */}
                        <h6 className="fw-bold text-primary mb-3">Logistics Information</h6>
                        <div className="row g-3 mb-4">
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">From State</label>
                                <input
                                    type="text"
                                    name="fromState"
                                    className="form-control form-control-sm"
                                    value={formData.fromState || 'IN-TS'}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">To State</label>
                                <input
                                    type="text"
                                    name="toState"
                                    className="form-control form-control-sm"
                                    value={formData.toState || ''}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">Delivery Status</label>
                                <select
                                    name="deliveryStatus"
                                    className="form-select form-select-sm"
                                    value={formData.deliveryStatus || 'Sale'}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                >
                                    <option value="Sale">Sale</option>
                                    <option value="CustomerReturn">Customer Return</option>
                                    <option value="LogisticsReturn">Logistics Return</option>
                                    <option value="Cancellation">Cancellation</option>
                                </select>
                            </div>
                            {(formData.deliveryStatus === 'CustomerReturn' || formData.deliveryStatus === 'LogisticsReturn') && (
                                <div className="col-md-4">
                                    <label className="form-label fw-medium small">Return Product Status</label>
                                    <select
                                        name="returnProductStatus"
                                        className="form-select form-select-sm"
                                        value={formData.returnProductStatus || 'Working'}
                                        onChange={handleChange}
                                        disabled={isViewMode}
                                    >
                                        <option value="Working">Working</option>
                                        <option value="Damaged">Damaged</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Financial Information */}
                        <h6 className="fw-bold text-primary mb-3">Financial Information</h6>
                        <div className="row g-3 mb-4">
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">Order Item Value (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="orderItemValue"
                                    className="form-control form-control-sm"
                                    value={formData.orderItemValue || 0}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">Customer Logistics Fee (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="customerLogisticsFee"
                                    className="form-control form-control-sm"
                                    value={formData.customerLogisticsFee || 0}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">Seller Price (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="sellerPrice"
                                    className="form-control form-control-sm"
                                    value={formData.sellerPrice || 0}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">Marketplace Fees (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="marketplaceFees"
                                    className="form-control form-control-sm"
                                    value={formData.marketplaceFees || 0}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">GST on Fees (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="gstOnFees"
                                    className="form-control form-control-sm"
                                    value={formData.gstOnFees || 0}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">Product Cost (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="productCost"
                                    className="form-control form-control-sm"
                                    value={formData.productCost || 0}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>

                        </div>

                        {/* Tax & Credits */}
                        <h6 className="fw-bold text-primary mb-3">Tax & Credits</h6>
                        <div className="row g-3 mb-4">
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">Input GST Credit (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="inputGstCredit"
                                    className="form-control form-control-sm"
                                    value={formData.inputGstCredit || 0}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">TDS Credit (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="tdsCredit"
                                    className="form-control form-control-sm"
                                    value={formData.tdsCredit || 0}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">Refund Amount (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="refundAmount"
                                    className="form-control form-control-sm"
                                    value={formData.refundAmount || 0}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-medium small">Total Discount (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="totalDiscount"
                                    className="form-control form-control-sm"
                                    value={formData.totalDiscount || 0}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                />
                            </div>
                        </div>

                        {/* Profit/Loss */}
                        <h6 className="fw-bold text-primary mb-3">Summary</h6>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label fw-medium small">
                                    Bank Settlement (₹)
                                    <span className="text-muted ms-2 small">(Auto-calculated)</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="bankSettlement"
                                    className={`form-control form-control-sm fw-bold ${formData.bankSettlement && formData.bankSettlement >= 0
                                        ? 'text-success'
                                        : 'text-danger'
                                        }`}
                                    value={formData.bankSettlement || 0}
                                    readOnly
                                    style={{ backgroundColor: '#f8f9fa' }}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-medium small">
                                    Profit/Loss (₹)
                                    <span className="text-muted ms-2 small">(Auto-calculated)</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="profitLoss"
                                    className={`form-control form-control-sm fw-bold ${formData.profitLoss && formData.profitLoss >= 0
                                        ? 'text-success'
                                        : 'text-danger'
                                        }`}
                                    value={formData.profitLoss || 0}
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
            </div >
        </div >
    );
};

export default FlipkartOrderModal;
