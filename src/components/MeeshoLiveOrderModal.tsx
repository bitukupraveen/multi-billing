import React, { useState, useEffect } from 'react';
import { Save, Eye, X } from 'lucide-react';
import type { MeeshoLiveOrder } from '../types';

interface MeeshoLiveOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: MeeshoLiveOrder | null;
    onSave: (order: MeeshoLiveOrder) => void;
    mode: 'view' | 'edit';
}

const MeeshoLiveOrderModal: React.FC<MeeshoLiveOrderModalProps> = ({ isOpen, onClose, order, onSave, mode }) => {
    const [formData, setFormData] = useState<MeeshoLiveOrder | null>(null);

    useEffect(() => {
        if (order) {
            setFormData(order);
        } else {
            setFormData({
                orderId: '',
                subOrderId: '',
                meeshoId: '',
                productTitle: '',
                skuId: '',
                quantity: 1,
                dispatchDate: '',
                uploadDate: new Date().toISOString()
            } as MeeshoLiveOrder);
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

    const renderInput = (label: string, name: keyof MeeshoLiveOrder, type: string = 'text') => (
        <div className="mb-3">
            <label className="form-label small fw-bold text-secondary mb-1">{label}</label>
            <div className="input-group input-group-sm shadow-sm border-0 rounded">
                <input
                    type={type}
                    name={name}
                    className={`form-control ${isViewMode ? 'bg-light border-0' : ''}`}
                    value={(formData[name] as any) || ''}
                    onChange={handleChange}
                    readOnly={isViewMode}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    step="any"
                    required
                />
            </div>
        </div>
    );

    const SectionTitle = ({ title }: { title: string }) => (
        <div className="col-12 mt-2 mb-3 border-bottom pb-2">
            <h6 className="fw-bold text-primary text-uppercase small mb-0 ls-wide">{title}</h6>
        </div>
    );

    return (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} tabIndex={-1}>
            <div className="modal-dialog modal-lg modal-dialog-scrollable modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
                    <div className="modal-header border-0 bg-light px-4 py-3">
                        <div className="d-flex align-items-center gap-3">
                            <div className={`p-2 rounded-circle ${isViewMode ? 'bg-primary-subtle text-primary' : 'bg-success-subtle text-success'}`}>
                                {isViewMode ? <Eye size={24} /> : <Save size={24} />}
                            </div>
                            <div>
                                <h5 className="modal-title fw-bold text-dark mb-0">{isViewMode ? 'View Live Order' : formData.id ? 'Edit Live Order' : 'Add Live Order'}</h5>
                                {formData.subOrderId && <p className="text-secondary small mb-0">Sub Order: <span className="fw-medium text-dark">{formData.subOrderId}</span></p>}
                            </div>
                        </div>
                        <button type="button" className="btn btn-link text-secondary p-0" onClick={onClose}>
                            <X size={24} />
                        </button>
                    </div>

                    <div className="modal-body p-4 bg-white">
                        <form id="meeshoLiveOrderForm" onSubmit={handleSubmit}>
                            <div className="row g-3">
                                <SectionTitle title="Order Identification" />
                                <div className="col-md-6">{renderInput("Order ID", "orderId")}</div>
                                <div className="col-md-6">{renderInput("Sub-order ID", "subOrderId")}</div>
                                <div className="col-md-12">{renderInput("Meesho ID", "meeshoId")}</div>

                                <SectionTitle title="Product Information" />
                                <div className="col-md-12">{renderInput("Product Title", "productTitle")}</div>
                                <div className="col-md-6">{renderInput("SKU ID", "skuId")}</div>
                                <div className="col-md-6">{renderInput("Quantity", "quantity", "number")}</div>

                                <SectionTitle title="Dispatch Details" />
                                <div className="col-md-6">{renderInput("Dispatch Date/SLA", "dispatchDate")}</div>
                            </div>
                        </form>
                    </div>

                    <div className="modal-footer border-0 bg-light p-3 px-4">
                        <div className="d-flex w-100 justify-content-end gap-2">
                            <button type="button" className="btn btn-outline-secondary px-4 rounded-pill fw-medium" onClick={onClose}>
                                {isViewMode ? 'Close' : 'Cancel'}
                            </button>
                            {!isViewMode && (
                                <button form="meeshoLiveOrderForm" type="submit" className="btn btn-primary px-4 rounded-pill d-flex align-items-center gap-2 fw-medium shadow-sm">
                                    <Save size={18} />
                                    {formData.id ? 'Save Changes' : 'Add Order'}
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

export default MeeshoLiveOrderModal;
