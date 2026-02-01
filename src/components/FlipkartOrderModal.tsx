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

const FlipkartOrderModal: React.FC<FlipkartOrderModalProps> = ({ isOpen, onClose, order, onSave, mode }) => {
    const [formData, setFormData] = useState<FlipkartOrder | null>(null);

    useEffect(() => {
        if (order) {
            setFormData(order);
        } else {
            setFormData({
                uploadDate: new Date().toISOString()
            } as FlipkartOrder);
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

    const renderInput = (label: string, name: keyof FlipkartOrder, type: string = 'text', prefix?: string) => (
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
                                <h5 className="modal-title fw-bold text-dark">{isViewMode ? 'View Flipkart Order' : 'Edit Flipkart Order'}</h5>
                                <p className="text-secondary small mb-0">Order ID: {formData.orderId || 'New'}</p>
                            </div>
                        </div>
                        <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
                    </div>

                    <div className="modal-body p-4 bg-white">
                        <form id="flipkartOrderForm" onSubmit={handleSubmit}>
                            <div className="row">
                                <SectionTitle title="Payment Details" />
                                <div className="col-md-4">{renderInput("NEFT ID", "neftId")}</div>
                                <div className="col-md-4">{renderInput("Neft Type", "neftType")}</div>
                                <div className="col-md-4">{renderInput("Payment Date", "paymentDate", "date")}</div>
                                <div className="col-md-4">{renderInput("Bank Settlement Value", "bankSettlementValue", "number", "₹")}</div>
                                <div className="col-md-4">{renderInput("Input GST + TCS Credits", "inputGstTcsCredits", "number", "₹")}</div>
                                <div className="col-md-4">{renderInput("Income Tax Credits", "incomeTaxCredits", "number", "₹")}</div>

                                <SectionTitle title="Transaction Summary" />
                                <div className="col-md-4">{renderInput("Order ID", "orderId")}</div>
                                <div className="col-md-4">{renderInput("Order Item ID", "orderItemId")}</div>
                                <div className="col-md-4">{renderInput("Sale Amount", "saleAmount", "number", "₹")}</div>
                                <div className="col-md-4">{renderInput("Total Offer Amount", "totalOfferAmountSum", "number", "₹")}</div>
                                <div className="col-md-4">{renderInput("My Share", "myShare", "number", "₹")}</div>
                                <div className="col-md-4">{renderInput("Customer Add-ons Amount", "customerAddOnsAmount", "number", "₹")}</div>
                                <div className="col-md-4">{renderInput("Marketplace Fee", "marketplaceFee", "number", "₹")}</div>
                                <div className="col-md-4">{renderInput("Taxes", "taxes", "number", "₹")}</div>
                                <div className="col-md-4">{renderInput("Offer Adjustments", "offerAdjustmentsSum", "number", "₹")}</div>
                                <div className="col-md-4">{renderInput("Protection Fund", "protectionFund", "number", "₹")}</div>
                                <div className="col-md-4">{renderInput("Refund", "refund", "number", "₹")}</div>

                                <SectionTitle title="Marketplace Fees" />
                                <div className="col-md-3">{renderInput("Tier", "tier")}</div>
                                <div className="col-md-3">{renderInput("Commission Rate (%)", "commissionRate", "number", "%")}</div>
                                <div className="col-md-3">{renderInput("Commission", "commission", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Fixed Fee", "fixedFee", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Collection Fee", "collectionFee", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Pick And Pack Fee", "pickAndPackFee", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Shipping Fee", "shippingFee", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Reverse Shipping Fee", "reverseShippingFee", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("No Cost EMI Reimbursement", "noCostEmiFeeReimbursement", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Installation Fee", "installationFee", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Tech Visit Fee", "techVisitFee", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Uninstallation & Packaging", "uninstallationPackagingFee", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Add-ons Recovery", "customerAddOnsAmountRecovery", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Franchise Fee", "franchiseFee", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Shopsy Marketing Fee", "shopsyMarketingFee", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Cancellation Fee", "productCancellationFee", "number", "₹")}</div>

                                <SectionTitle title="Taxes" />
                                <div className="col-md-4">{renderInput("TCS", "tcs", "number", "₹")}</div>
                                <div className="col-md-4">{renderInput("TDS", "tds", "number", "₹")}</div>
                                <div className="col-md-4">{renderInput("GST on MP Fees", "gstOnMpFees", "number", "₹")}</div>

                                <SectionTitle title="Offer Adjustments" />
                                <div className="col-md-6">{renderInput("Offer Amount Settled as Discount in MP Fee", "offerAmountSettledAsDiscountInMpFee", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Item GST Rate (%)", "itemGstRate", "number", "%")}</div>
                                <div className="col-md-3">{renderInput("Discount in MP fees", "discountInMpFees", "number", "₹")}</div>
                                <div className="col-md-4">{renderInput("GST on Discount", "gstOnDiscount", "number", "₹")}</div>
                                <div className="col-md-4">{renderInput("Total Discount in MP Fee", "totalDiscountInMpFee", "number", "₹")}</div>
                                <div className="col-md-4">{renderInput("Offer Adjustment", "offerAdjustment", "number", "₹")}</div>

                                <SectionTitle title="Shipping Details" />
                                <div className="col-md-4">{renderInput("Length*Breadth*Height", "lengthBreadthHeight")}</div>
                                <div className="col-md-4">{renderInput("Volumetric Weight (kgs)", "volumetricWeight", "number")}</div>
                                <div className="col-md-4">{renderInput("Chargeable Weight Source", "chargeableWeightSource")}</div>
                                <div className="col-md-4">{renderInput("Chargeable Weight Type", "chargeableWeightType")}</div>
                                <div className="col-md-4">{renderInput("Chargeable Wt. Slab (In Kgs)", "chargeableWtSlab", "number")}</div>
                                <div className="col-md-4">{renderInput("Shipping Zone", "shippingZone")}</div>

                                <SectionTitle title="Order Details" />
                                <div className="col-md-3">{renderInput("Order Date", "orderDate", "date")}</div>
                                <div className="col-md-3">{renderInput("Dispatch Date", "dispatchDate", "date")}</div>
                                <div className="col-md-3">{renderInput("Fulfilment Type", "fulfilmentType")}</div>
                                <div className="col-md-3">{renderInput("Seller SKU", "sellerSku")}</div>
                                <div className="col-md-3">{renderInput("Quantity", "quantity", "number")}</div>
                                <div className="col-md-3">{renderInput("Product Sub Category", "productSubCategory")}</div>
                                <div className="col-md-3">{renderInput("ReturnType", "returnType")}</div>
                                <div className="col-md-3">{renderInput("Shopsy Order", "shopsyOrder")}</div>
                                <div className="col-md-3">{renderInput("Item Return Status", "itemReturnStatus")}</div>
                                <div className="col-md-9">{renderInput("Additional Information", "additionalInformation")}</div>

                                <SectionTitle title="Buyer Invoice Details" />
                                <div className="col-md-6">{renderInput("Invoice ID", "invoiceId")}</div>
                                <div className="col-md-6">{renderInput("Invoice Date", "invoiceDate", "date")}</div>

                                <SectionTitle title="Buyer Sale Details" />
                                <div className="col-md-3">{renderInput("Total Sale Amount", "totalSaleAmount", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Total Offer Amount", "totalOfferAmount", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Free Shipping Offer", "freeShippingOffer", "number", "₹")}</div>
                                <div className="col-md-3">{renderInput("Non-Free Shipping Offer", "nonFreeShippingOffer", "number", "₹")}</div>

                                <SectionTitle title="My Share" />
                                <div className="col-md-4">{renderInput("Total My Share", "totalMyShare", "number", "₹")}</div>
                                <div className="col-md-4">{renderInput("Free Shipping Offer", "myShareFreeShippingOffer", "number", "₹")}</div>
                                <div className="col-md-4">{renderInput("Non-Free Shipping Offer", "myShareNonFreeShippingOffer", "number", "₹")}</div>
                            </div>
                        </form>
                    </div>

                    <div className="modal-footer border-0 bg-light p-3 px-4 d-flex justify-content-end gap-2">
                        <button type="button" className="btn btn-outline-secondary px-4 rounded-pill" onClick={onClose}>
                            {isViewMode ? 'Close' : 'Cancel'}
                        </button>
                        {!isViewMode && (
                            <button form="flipkartOrderForm" type="submit" className="btn btn-primary px-4 rounded-pill d-flex align-items-center gap-2">
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

export default FlipkartOrderModal;
