import React, { useState, useEffect } from 'react';
import { Save, Eye } from 'lucide-react';
import type { FlipkartGSTReportRecord } from '../types';

interface FlipkartGSTReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    report: FlipkartGSTReportRecord | null;
    onSave: (updatedReport: FlipkartGSTReportRecord) => void;
    mode: 'view' | 'edit';
}

const FlipkartGSTReportModal: React.FC<FlipkartGSTReportModalProps> = ({ isOpen, onClose, report, onSave, mode }) => {
    const [formData, setFormData] = useState<FlipkartGSTReportRecord | null>(null);

    useEffect(() => {
        if (report) {
            setFormData({ ...report });
        } else {
            setFormData(null);
        }
    }, [report, isOpen]);

    const handleInputChange = (field: keyof FlipkartGSTReportRecord, value: any) => {
        if (!formData) return;
        const newData = { ...formData, [field]: value };

        // Auto Calculations
        if (['priceBeforeDiscount', 'totalDiscount'].includes(field)) {
            const pbd = field === 'priceBeforeDiscount' ? Number(value) : (formData.priceBeforeDiscount || 0);
            const td = field === 'totalDiscount' ? Number(value) : (formData.totalDiscount || 0);
            newData.priceAfterDiscount = pbd - td;

            // Also update final invoice amount based on new price after discount
            const pad = newData.priceAfterDiscount;
            const sc = formData.shippingCharges || 0;
            newData.finalInvoiceAmount = pad + sc;
        }

        if (field === 'shippingCharges') {
            const pad = formData.priceAfterDiscount || 0;
            const sc = Number(value);
            newData.finalInvoiceAmount = pad + sc;
        }

        if (['finalInvoiceAmount', 'igstAmount', 'cgstAmount', 'sgstAmount', 'luxuryCessAmount'].includes(field)) {
            const fia = field === 'finalInvoiceAmount' ? Number(value) : (newData.finalInvoiceAmount || 0);
            const igst = field === 'igstAmount' ? Number(value) : (newData.igstAmount || 0);
            const cgst = field === 'cgstAmount' ? Number(value) : (newData.cgstAmount || 0);
            const sgst = field === 'sgstAmount' ? Number(value) : (newData.sgstAmount || 0);
            const cess = field === 'luxuryCessAmount' ? Number(value) : (newData.luxuryCessAmount || 0);

            newData.taxableValue = fia - (igst + cgst + sgst + cess);
        }

        setFormData(newData);
    };

    if (!isOpen || !formData) return null;

    const renderInput = (label: string, field: keyof FlipkartGSTReportRecord, type: string = 'text', prefix: string = '') => (
        <div className="mb-3">
            <label className="form-label small fw-bold text-secondary mb-1">{label}</label>
            <div className="input-group input-group-sm">
                {prefix && <span className="input-group-text bg-light">{prefix}</span>}
                <input
                    type={type}
                    className={`form-control ${mode === 'view' ? 'bg-light border-0' : ''}`}
                    value={(formData[field] as string | number) ?? ''}
                    onChange={(e) => handleInputChange(field, type === 'number' ? Number(e.target.value) : e.target.value)}
                    readOnly={mode === 'view'}
                />
            </div>
        </div>
    );

    const SectionTitle = ({ title }: { title: string }) => (
        <h6 className="fw-bold text-primary border-bottom pb-2 mb-3 mt-4">{title}</h6>
    );

    return (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px' }}>
                    <div className="modal-header bg-white border-bottom-0 p-4">
                        <div className="d-flex align-items-center gap-2">
                            {mode === 'view' ? <Eye className="text-primary" /> : <Save className="text-success" />}
                            <h5 className="modal-title fw-bold">
                                {mode === 'view' ? 'View Report Record' : 'Edit Report Record'}
                            </h5>
                        </div>
                        <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
                    </div>
                    <div className="modal-body p-4 bg-light-subtle">
                        <div className="row">
                            {/* Order Info */}
                            <div className="col-12"><SectionTitle title="Order & Product Identification" /></div>
                            <div className="col-md-3">{renderInput("Seller GSTIN", "sellerGstin")}</div>
                            <div className="col-md-3">{renderInput("Order ID", "orderId")}</div>
                            <div className="col-md-3">{renderInput("Order Item ID", "orderItemId")}</div>
                            <div className="col-md-3">{renderInput("Product Title", "productTitle")}</div>
                            <div className="col-md-3">{renderInput("FSN", "fsn")}</div>
                            <div className="col-md-3">{renderInput("SKU", "sku")}</div>
                            <div className="col-md-3">{renderInput("HSN Code", "hsnCode")}</div>
                            <div className="col-md-3">{renderInput("IMEI", "imei")}</div>

                            {/* Event & Logistics */}
                            <div className="col-12"><SectionTitle title="Event & Fulfilment Details" /></div>
                            <div className="col-md-3">{renderInput("Event Type", "eventType")}</div>
                            <div className="col-md-3">{renderInput("Event Sub Type", "eventSubType")}</div>
                            <div className="col-md-3">{renderInput("Order Type", "orderType")}</div>
                            <div className="col-md-3">{renderInput("Fulfilment Type", "fulfilmentType")}</div>
                            <div className="col-md-3">{renderInput("Order Date", "orderDate")}</div>
                            <div className="col-md-3">{renderInput("Order Approval Date", "orderApprovalDate")}</div>
                            <div className="col-md-3">{renderInput("Item Quantity", "itemQuantity", "number")}</div>
                            <div className="col-md-3">{renderInput("Shipped From State", "shippedFromState")}</div>
                            <div className="col-md-3">{renderInput("Warehouse ID", "warehouseId")}</div>

                            {/* Financials - Primary */}
                            <div className="col-12"><SectionTitle title="Pricing & Invoicing" /></div>
                            <div className="col-md-3">{renderInput("Price Before Discount", "priceBeforeDiscount", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("Total Discount", "totalDiscount", "number", "₹")}</div>
                            <div className="col-md-3">
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-primary mb-1">Price After Discount (Auto)</label>
                                    <div className="input-group input-group-sm">
                                        <span className="input-group-text bg-primary-subtle border-primary-subtle text-primary">₹</span>
                                        <input type="number" className="form-control bg-primary-subtle border-primary-subtle" value={formData.priceAfterDiscount || 0} readOnly />
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">{renderInput("Shipping Charges", "shippingCharges", "number", "₹")}</div>
                            <div className="col-md-3">
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-success mb-1">Final Invoice Amount (Auto)</label>
                                    <div className="input-group input-group-sm">
                                        <span className="input-group-text bg-success-subtle border-success-subtle text-success">₹</span>
                                        <input type="number" className="form-control bg-success-subtle border-success-subtle" value={formData.finalInvoiceAmount || 0} readOnly />
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">{renderInput("Buyer Invoice ID", "buyerInvoiceId")}</div>
                            <div className="col-md-3">{renderInput("Buyer Invoice Date", "buyerInvoiceDate")}</div>
                            <div className="col-md-3">{renderInput("Buyer Invoice Amount", "buyerInvoiceAmount", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("Usual Price", "usualPrice", "number", "₹")}</div>

                            {/* Taxes */}
                            <div className="col-12"><SectionTitle title="GST & Taxation Detailed" /></div>
                            <div className="col-md-3">{renderInput("Type of Tax", "taxType")}</div>
                            <div className="col-md-3">
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-info mb-1">Taxable Value (Auto)</label>
                                    <div className="input-group input-group-sm">
                                        <span className="input-group-text bg-info-subtle border-info-subtle text-info">₹</span>
                                        <input type="number" className="form-control bg-info-subtle border-info-subtle" value={formData.taxableValue || 0} readOnly />
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">{renderInput("IGST Rate %", "igstRate", "number")}</div>
                            <div className="col-md-3">{renderInput("IGST Amount", "igstAmount", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("CGST Rate %", "cgstRate", "number")}</div>
                            <div className="col-md-3">{renderInput("CGST Amount", "cgstAmount", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("SGST/UTGST Rate %", "sgstRate", "number")}</div>
                            <div className="col-md-3">{renderInput("SGST/UTGST Amount", "sgstAmount", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("Luxury Cess Rate %", "luxuryCessRate", "number")}</div>
                            <div className="col-md-3">{renderInput("Luxury Cess Amount", "luxuryCessAmount", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("VAT Rate %", "vatRate", "number")}</div>
                            <div className="col-md-3">{renderInput("VAT Amount", "vatAmount", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("CST Rate %", "cstRate", "number")}</div>
                            <div className="col-md-3">{renderInput("CST Amount", "cstAmount", "number", "₹")}</div>

                            {/* TCS & TDS */}
                            <div className="col-12"><SectionTitle title="TCS & TDS Section" /></div>
                            <div className="col-md-3">{renderInput("TCS IGST Rate %", "tcsIgstRate", "number")}</div>
                            <div className="col-md-3">{renderInput("TCS IGST Amount", "tcsIgstAmount", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("TCS CGST Rate %", "tcsCgstRate", "number")}</div>
                            <div className="col-md-3">{renderInput("TCS CGST Amount", "tcsCgstAmount", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("TCS SGST Rate %", "tcsSgstRate", "number")}</div>
                            <div className="col-md-3">{renderInput("TCS SGST Amount", "tcsSgstAmount", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("Total TCS Deducted", "totalTcsDeducted", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("TDS Rate %", "tdsRate", "number")}</div>
                            <div className="col-md-3">{renderInput("TDS Amount", "tdsAmount", "number", "₹")}</div>

                            {/* Customer & Business */}
                            <div className="col-12"><SectionTitle title="Customer & Business Information" /></div>
                            <div className="col-md-3">{renderInput("Billing Pincode", "billingPincode")}</div>
                            <div className="col-md-3">{renderInput("Billing State", "billingState")}</div>
                            <div className="col-md-3">{renderInput("Delivery Pincode", "deliveryPincode")}</div>
                            <div className="col-md-3">{renderInput("Delivery State", "deliveryState")}</div>
                            <div className="col-md-3">{renderInput("Is Shopsy Order?", "isShopsyOrder")}</div>
                            <div className="col-md-3">{renderInput("IRN", "irn")}</div>
                            <div className="col-md-3">{renderInput("Business Name", "businessName")}</div>
                            <div className="col-md-3">{renderInput("Business GST Number", "businessGstNumber")}</div>
                            <div className="col-md-3">{renderInput("Beneficiary Name", "beneficiaryName")}</div>
                            <div className="col-md-3">{renderInput("Seller Share", "sellerShare", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("Bank Offer Share", "bankOfferShare", "number", "₹")}</div>
                        </div>
                    </div>
                    <div className="modal-footer border-top-0 p-4 pt-0">
                        <button type="button" className="btn btn-light px-4" onClick={onClose}>Close</button>
                        {mode === 'edit' && (
                            <button
                                type="button"
                                className="btn btn-primary px-4 d-flex align-items-center gap-2"
                                onClick={() => onSave(formData)}
                            >
                                <Save size={18} />
                                Save Changes
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FlipkartGSTReportModal;
