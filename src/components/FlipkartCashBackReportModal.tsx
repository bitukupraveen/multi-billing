import React, { useState, useEffect } from 'react';
import { Save, Eye } from 'lucide-react';
import type { FlipkartCashBackReportRecord } from '../types';

interface FlipkartCashBackReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    report: FlipkartCashBackReportRecord | null;
    onSave: (updatedReport: FlipkartCashBackReportRecord) => void;
    mode: 'view' | 'edit';
}

const FlipkartCashBackReportModal: React.FC<FlipkartCashBackReportModalProps> = ({ isOpen, onClose, report, onSave, mode }) => {
    const [formData, setFormData] = useState<FlipkartCashBackReportRecord | null>(null);

    useEffect(() => {
        if (report) {
            setFormData({ ...report });
        } else {
            setFormData(null);
        }
    }, [report, isOpen]);

    const handleInputChange = (field: keyof FlipkartCashBackReportRecord, value: any) => {
        if (!formData) return;
        setFormData({ ...formData, [field]: value });
    };

    if (!isOpen || !formData) return null;

    const renderInput = (label: string, field: keyof FlipkartCashBackReportRecord, type: string = 'text', prefix: string = '') => (
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
                                {mode === 'view' ? 'View Cash Back Record' : 'Edit Cash Back Record'}
                            </h5>
                        </div>
                        <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
                    </div>
                    <div className="modal-body p-4 bg-light-subtle">
                        <div className="row">
                            {/* Record Identification */}
                            <div className="col-12"><SectionTitle title="Identification" /></div>
                            <div className="col-md-3">{renderInput("Seller GSTIN", "sellerGstin")}</div>
                            <div className="col-md-3">{renderInput("Order ID", "orderId")}</div>
                            <div className="col-md-3">{renderInput("Order Item ID", "orderItemId")}</div>
                            <div className="col-md-3">{renderInput("Document Type", "documentType")}</div>
                            <div className="col-md-3">{renderInput("Document Sub Type", "documentSubType")}</div>
                            <div className="col-md-3">{renderInput("Credit Note ID/ Debit Note ID", "noteId")}</div>

                            {/* Financial Summary */}
                            <div className="col-12"><SectionTitle title="Financial Summary" /></div>
                            <div className="col-md-3">{renderInput("Invoice Amount", "invoiceAmount", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("Invoice Date", "invoiceDate")}</div>
                            <div className="col-md-3">{renderInput("Taxable Value", "taxableValue", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("Is Shopsy Order?", "isShopsyOrder")}</div>

                            {/* Main Taxes */}
                            <div className="col-12"><SectionTitle title="GST Details" /></div>
                            <div className="col-md-3">{renderInput("IGST Rate %", "igstRate", "number")}</div>
                            <div className="col-md-3">{renderInput("IGST Amount", "igstAmount", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("CGST Rate %", "cgstRate", "number")}</div>
                            <div className="col-md-3">{renderInput("CGST Amount", "cgstAmount", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("SGST Rate (or UTGST)", "sgstRate", "number")}</div>
                            <div className="col-md-3">{renderInput("SGST Amount (Or UTGST)", "sgstAmount", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("Luxury Cess Rate", "luxuryCessRate", "number")}</div>
                            <div className="col-md-3">{renderInput("Luxury Cess Amount", "luxuryCessAmount", "number", "₹")}</div>

                            {/* TCS & Charges */}
                            <div className="col-12"><SectionTitle title="TCS & TDS Section" /></div>
                            <div className="col-md-3">{renderInput("TCS IGST Rate %", "tcsIgstRate", "number")}</div>
                            <div className="col-md-3">{renderInput("TCS IGST Amount", "tcsIgstAmount", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("TCS CGST Rate %", "tcsCgstRate", "number")}</div>
                            <div className="col-md-3">{renderInput("TCS CGST Amount", "tcsCgstAmount", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("TCS SGST Rate", "tcsSgstRate", "number")}</div>
                            <div className="col-md-3">{renderInput("TCS SGST Amount", "tcsSgstAmount", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("Total TCS Deducted", "totalTcsDeducted", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("TDS Rate %", "tdsRate", "number")}</div>
                            <div className="col-md-3">{renderInput("TDS Amount", "tdsAmount", "number", "₹")}</div>

                            {/* Business & Delivery */}
                            <div className="col-12"><SectionTitle title="Business & Delivery Info" /></div>
                            <div className="col-md-3">{renderInput("Delivery State", "deliveryState")}</div>
                            <div className="col-md-3">{renderInput("IRN", "irn")}</div>
                            <div className="col-md-3">{renderInput("Business Name", "businessName")}</div>
                            <div className="col-md-3">{renderInput("Business GST Number", "businessGstNumber")}</div>
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

export default FlipkartCashBackReportModal;
