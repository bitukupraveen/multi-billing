import React, { useState, useEffect } from 'react';
import { Save, Eye } from 'lucide-react';
import type { MeeshoSalesReturnRecord } from '../types';

interface MeeshoSalesReturnModalProps {
    isOpen: boolean;
    onClose: () => void;
    report: MeeshoSalesReturnRecord | null;
    onSave: (updatedReport: MeeshoSalesReturnRecord) => void;
    mode: 'view' | 'edit';
}

const MeeshoSalesReturnModal: React.FC<MeeshoSalesReturnModalProps> = ({ isOpen, onClose, report, onSave, mode }) => {
    const [formData, setFormData] = useState<MeeshoSalesReturnRecord | null>(null);

    useEffect(() => {
        if (report) {
            setFormData({ ...report });
        } else {
            setFormData(null);
        }
    }, [report, isOpen]);

    const handleInputChange = (field: keyof MeeshoSalesReturnRecord, value: any) => {
        if (!formData) return;
        const newData = { ...formData, [field]: value };

        // Auto Calculations
        if (['totalTaxableSaleValue', 'taxAmount', 'taxableShipping'].includes(field)) {
            const taxableValue = field === 'totalTaxableSaleValue' ? Number(value) : (formData.totalTaxableSaleValue || 0);
            const taxAmount = field === 'taxAmount' ? Number(value) : (formData.taxAmount || 0);
            const taxableShipping = field === 'taxableShipping' ? Number(value) : (formData.taxableShipping || 0);
            newData.totalInvoiceValue = Number((taxableValue + taxAmount + taxableShipping).toFixed(2));
        }

        setFormData(newData);
    };

    if (!isOpen || !formData) return null;

    const renderInput = (label: string, field: keyof MeeshoSalesReturnRecord, type: string = 'text', prefix: string = '') => (
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
                                {mode === 'view' ? 'View Meesho Sales Return Record' : 'Edit Meesho Sales Return Record'}
                            </h5>
                        </div>
                        <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
                    </div>
                    <div className="modal-body p-4 bg-light-subtle">
                        <div className="row">
                            {/* Identification */}
                            <div className="col-12"><SectionTitle title="Identification Details" /></div>
                            <div className="col-md-3">{renderInput("Identifier", "identifier")}</div>
                            <div className="col-md-3">{renderInput("Supplier ID", "supplierId")}</div>
                            <div className="col-md-3">{renderInput("Supplier Name", "supName")}</div>
                            <div className="col-md-3">{renderInput("GSTIN", "gstin")}</div>
                            <div className="col-md-3">{renderInput("Sub Order Num", "subOrderNum")}</div>
                            <div className="col-md-3">{renderInput("Enrollment No", "enrollmentNo")}</div>

                            {/* Order Details */}
                            <div className="col-12"><SectionTitle title="Order & Return Details" /></div>
                            <div className="col-md-3">{renderInput("Order Date", "orderDate")}</div>
                            <div className="col-md-3">{renderInput("Cancel/Return Date", "cancelReturnDate")}</div>
                            <div className="col-md-3">{renderInput("HSN Code", "hsnCode")}</div>
                            <div className="col-md-3">{renderInput("Quantity", "quantity", "number")}</div>
                            <div className="col-md-3">{renderInput("GST Rate (%)", "gstRate", "number")}</div>
                            <div className="col-md-3">{renderInput("End Customer State", "endCustomerStateNew")}</div>

                            {/* Financials */}
                            <div className="col-12"><SectionTitle title="Financial Details" /></div>
                            <div className="col-md-3">{renderInput("Taxable Sale Value", "totalTaxableSaleValue", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("Tax Amount", "taxAmount", "number", "₹")}</div>
                            <div className="col-md-3">{renderInput("Taxable Shipping", "taxableShipping", "number", "₹")}</div>
                            <div className="col-md-3">
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-success mb-1">Total Invoice Value (Auto)</label>
                                    <div className="input-group input-group-sm">
                                        <span className="input-group-text bg-success-subtle border-success-subtle text-success">₹</span>
                                        <input type="number" className="form-control bg-success-subtle border-success-subtle" value={formData.totalInvoiceValue || 0} readOnly />
                                    </div>
                                </div>
                            </div>

                            {/* Periodic Details */}
                            <div className="col-12"><SectionTitle title="Periodic Details" /></div>
                            <div className="col-md-3">{renderInput("Financial Year", "financialYear")}</div>
                            <div className="col-md-3">{renderInput("Month Number", "monthNumber", "number")}</div>
                            <div className="col-md-4">{renderInput("Upload Date", "uploadDate")}</div>
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

export default MeeshoSalesReturnModal;
