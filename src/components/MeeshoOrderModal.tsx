import React, { useState, useEffect } from 'react';
import { Save, Eye, X } from 'lucide-react';
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
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} tabIndex={-1}>
            <div className="modal-dialog modal-xl modal-dialog-scrollable modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
                    <div className="modal-header border-0 bg-light px-4 py-3">
                        <div className="d-flex align-items-center gap-3">
                            <div className={`p-2 rounded-circle ${isViewMode ? 'bg-primary-subtle text-primary' : 'bg-success-subtle text-success'}`}>
                                {isViewMode ? <Eye size={24} /> : <Save size={24} />}
                            </div>
                            <div>
                                <h5 className="modal-title fw-bold text-dark mb-0">{isViewMode ? 'View Order Details' : 'Edit Order Details'}</h5>
                                <p className="text-secondary small mb-0">Sub Order: <span className="fw-medium text-dark">{formData.subOrderNo}</span></p>
                            </div>
                        </div>
                        <button type="button" className="btn btn-link text-secondary p-0" onClick={onClose}>
                            <X size={24} />
                        </button>
                    </div>

                    <div className="modal-body p-4 bg-white">
                        <form id="meeshoOrderForm" onSubmit={handleSubmit}>
                            <div className="row g-3">
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
                                <div className="col-md-3">{renderInput("Total Sale Amount (Incl. Shipping & GST)", "totalSaleAmount", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Total Sale Return Amount (Incl. Shipping & GST)", "totalSaleReturnAmount", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Fixed Fee (Incl. GST)", "fixedFeeRevenue", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Warehousing Fee (Incl. GST)", "warehousingFeeRevenue", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Return Premium (Incl. GST)", "returnPremium", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Return Premium (Incl. GST) of Return", "returnPremiumOfReturn", "number", "₹")}</div>

                                <SectionTitle title="Deductions" />
                                <div className="col-md-3">{renderInput("Meesho Commission Percentage", "meeshoCommissionPercentage", "number")}</div>
                                <div className="col-md-3">{renderInput("Meesho Commission (Incl. GST)", "meeshoCommission", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Meesho Gold Platform Fee (Incl. GST)", "meeshoGoldPlatformFee", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Meesho Mall Platform Fee (Incl. GST)", "meeshoMallPlatformFee", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Fixed Fee (Incl. GST)", "fixedFeeDeduction", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Warehousing Fee (Incl. GST)", "warehousingFeeDeduction", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Return Shipping Charge (Incl. GST)", "returnShippingCharge", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("GST Compensation (PRP Shipping)", "gstCompensationPRP", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Shipping Charge (Incl. GST)", "shippingCharge", "number", "₹")}</div>

                                <SectionTitle title="Other Charges" />
                                <div className="col-md-3">{renderInput("Other Support Service Charges (Excl. GST)", "otherSupportServiceCharges", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Waivers (Excl. GST)", "waivers", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Net Other Support Service Charges (Excl. GST)", "netOtherSupportServiceCharges", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("GST on Net Other Support Service Charges", "gstOnNetOtherSupportServiceCharges", "number", "₹")}</div>

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

                    <div className="modal-footer border-0 bg-light p-3 px-4">
                        <div className="d-flex w-100 justify-content-end gap-2">
                            <button type="button" className="btn btn-outline-secondary px-4 rounded-pill fw-medium" onClick={onClose}>
                                {isViewMode ? 'Close' : 'Cancel'}
                            </button>
                            {!isViewMode && (
                                <button form="meeshoOrderForm" type="submit" className="btn btn-primary px-4 rounded-pill d-flex align-items-center gap-2 fw-medium shadow-sm">
                                    <Save size={18} />
                                    Save Changes
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                .ls-wide { letter-spacing: 0.05rem; }
            `}</style>
        </div>
    );
};

export default MeeshoOrderModal;
