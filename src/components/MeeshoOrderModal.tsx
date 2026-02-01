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

const MeeshoOrderModal: React.FC<MeeshoOrderModalProps> = ({ isOpen, onClose, order, onSave, mode }) => {
    const [formData, setFormData] = useState<MeeshoOrder | null>(null);

    useEffect(() => {
        if (order) {
            setFormData(order);
        } else {
            setFormData({
                subOrderNo: '',
                uploadDate: new Date().toISOString()
            });
        }
    }, [order, isOpen]);

    if (!isOpen || !formData) return null;

    const isViewMode = mode === 'view';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                [name]: type === 'number' ? Number(value) : value
            };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) onSave(formData);
    };

    const renderInput = (label: string, name: keyof MeeshoOrder, type: string = 'text', prefix?: string) => (
        <div className="mb-3">
            <label className="form-label small fw-bold text-secondary mb-1">{label}</label>
            <div className="input-group input-group-sm shadow-sm border-0 rounded">
                {prefix && <span className="input-group-text bg-light border-end-0">{prefix}</span>}
                <input
                    type={type}
                    name={name}
                    className={`form-control border-start-${prefix ? '0' : '1'} ${isViewMode ? 'bg-light border-0' : ''}`}
                    value={(formData[name] as any) || ''}
                    onChange={handleChange}
                    readOnly={isViewMode}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    step="any"
                />
            </div>
        </div>
    );

    const SectionTitle = ({ title }: { title: string }) => (
        <div className="col-12 mt-4 mb-3 border-bottom pb-2">
            <h6 className="fw-bold text-primary text-uppercase small mb-0 ls-wide">{title}</h6>
        </div>
    );

    return (
        <div className="modal fade show d-block shadow-lg" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} tabIndex={-1}>
            <div className="modal-dialog modal-xl modal-dialog-scrollable modal-dialog-centered">
                <div className="modal-content border-0 overflow-hidden" style={{ borderRadius: '1.25rem' }}>
                    <div className="modal-header border-0 bg-white px-4 py-3 d-flex justify-content-between align-items-center bg-light">
                        <div className="d-flex align-items-center gap-3">
                            <div className={`p-2 rounded-lg ${isViewMode ? 'bg-primary-subtle text-primary' : 'bg-success-subtle text-success'}`}>
                                {isViewMode ? <Eye size={20} /> : <Save size={20} />}
                            </div>
                            <div>
                                <h5 className="modal-title fw-bold text-dark">{isViewMode ? 'View Meesho Order' : 'Edit Meesho Order'}</h5>
                                <p className="text-secondary small mb-0">Sub Order: {formData.subOrderNo}</p>
                            </div>
                        </div>
                        <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
                    </div>

                    <div className="modal-body p-4 bg-white">
                        <form id="meeshoOrderForm" onSubmit={handleSubmit}>
                            <div className="row">
                                <SectionTitle title="Order Related Details" />
                                <div className="col-md-3">{renderInput("Sub Order No", "subOrderNo")}</div>
                                <div className="col-md-3">{renderInput("Order Date", "orderDate", "date")}</div>
                                <div className="col-md-3">{renderInput("Dispatch Date", "dispatchDate", "date")}</div>
                                <div className="col-md-3">{renderInput("Product Name", "productName")}</div>
                                <div className="col-md-3">{renderInput("Supplier SKU", "supplierSku")}</div>
                                <div className="col-md-3">{renderInput("Catalog ID", "catalogId")}</div>
                                <div className="col-md-3">{renderInput("Order Source", "orderSource")}</div>
                                <div className="col-md-3">{renderInput("Live Order Status", "liveOrderStatus")}</div>
                                <div className="col-md-3">{renderInput("Product GST %", "productGstPercentage", "number")}</div>
                                <div className="col-md-3">{renderInput("Listing Price (Incl. taxes)", "listingPrice", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Quantity", "quantity", "number")}</div>

                                <SectionTitle title="Payment Details" />
                                <div className="col-md-4">{renderInput("Transaction ID", "transactionId")}</div>
                                <div className="col-md-4">{renderInput("Payment Date", "paymentDate", "date")}</div>
                                <div className="col-md-4">{renderInput("Final Settlement Amount", "finalSettlementAmount", "number", "₹")}</div>

                                <SectionTitle title="Revenue Details" />
                                <div className="col-md-3">{renderInput("Price Type", "priceType")}</div>
                                <div className="col-md-3">{renderInput("Total Sale Amount", "totalSaleAmount", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Total Sale Return Amount", "totalSaleReturnAmount", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Fixed Fee (Revenue)", "fixedFeeRevenue", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Warehousing Fee (Revenue)", "warehousingFeeRevenue", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Return Premium", "returnPremium", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Return Premium of Return", "returnPremiumOfReturn", "number", "₹")}</div>

                                <SectionTitle title="Deductions" />
                                <div className="col-md-3">{renderInput("Commission %", "meeshoCommissionPercentage", "number")}</div>
                                <div className="col-md-3">{renderInput("Commission (Incl. GST)", "meeshoCommission", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Gold Platform Fee", "meeshoGoldPlatformFee", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Mall Platform Fee", "meeshoMallPlatformFee", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Fixed Fee (Deduction)", "fixedFeeDeduction", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Warehousing Fee (Deduction)", "warehousingFeeDeduction", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Return Shipping", "returnShippingCharge", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("GST Compensation (PRP)", "gstCompensationPRP", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Shipping Charge", "shippingCharge", "number", "₹")}</div>

                                <SectionTitle title="Other Charges" />
                                <div className="col-md-3">{renderInput("Support Service Charges", "otherSupportServiceCharges", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Waivers", "waivers", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Net Support Charges", "netOtherSupportServiceCharges", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("GST on Net Charges", "gstOnNetOtherSupportServiceCharges", "number", "₹")}</div>

                                <SectionTitle title="TCS & TDS" />
                                <div className="col-md-4">{renderInput("TCS", "tcs", "number", "₹")}</div>
                                <div className="col-md-4">{renderInput("TDS Rate %", "tdsRatePercentage", "number")}</div>
                                <div className="col-md-4">{renderInput("TDS", "tds", "number", "₹")}</div>

                                <SectionTitle title="Compensation Details" />
                                <div className="col-md-4">{renderInput("Compensation", "compensation", "number", "₹")}</div>
                                <div className="col-md-4">{renderInput("Claims", "claims", "number", "₹")}</div>
                                <div className="col-md-4">{renderInput("Recovery", "recovery", "number", "₹")}</div>
                                <div className="col-md-4">{renderInput("Compensation Reason", "compensationReason")}</div>
                                <div className="col-md-4">{renderInput("Claims Reason", "claimsReason")}</div>
                                <div className="col-md-4">{renderInput("Recovery Reason", "recoveryReason")}</div>
                            </div>
                        </form>
                    </div>

                    <div className="modal-footer border-0 bg-light p-3 px-4 d-flex justify-content-end gap-2">
                        <button type="button" className="btn btn-outline-secondary px-4 rounded-pill" onClick={onClose}>
                            {isViewMode ? 'Close' : 'Cancel'}
                        </button>
                        {!isViewMode && (
                            <button form="meeshoOrderForm" type="submit" className="btn btn-primary px-4 rounded-pill d-flex align-items-center gap-2">
                                <Save size={18} />
                                Save Order
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <style>{`
                .ls-wide { letter-spacing: 0.05rem; }
                .rounded-lg { border-radius: 0.75rem; }
            `}</style>
        </div>
    );
};

export default MeeshoOrderModal;
