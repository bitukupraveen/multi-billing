import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import type { Customer } from '../types';

interface CustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer: Customer) => void;
    customer: Customer | null;
}

const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose, onSave, customer }) => {
    const initialState: Customer = {
        id: '',
        name: '',
        email: '',
        phone: '',
        gst: '',
        address: ''
    };

    const [formData, setFormData] = useState<Customer>(initialState);

    useEffect(() => {
        if (customer) {
            setFormData(customer);
        } else {
            setFormData({ ...initialState, id: crypto.randomUUID() });
        }
    }, [customer, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1} role="dialog">
            <div className="modal-dialog modal-md modal-dialog-centered" role="document">
                <div className="modal-content shadow-lg border-0">
                    <div className="modal-header border-bottom-0">
                        <h5 className="modal-title fw-bold">{customer ? 'Edit Customer' : 'Add New Customer'}</h5>
                        <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="row g-3">
                                <div className="col-12">
                                    <label className="form-label text-muted small fw-bold">Customer Name</label>
                                    <input
                                        required
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="form-control"
                                        placeholder="Enter customer name"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label text-muted small fw-bold">Phone Number</label>
                                    <input
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="form-control"
                                        placeholder="Enter phone number"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label text-muted small fw-bold">GST Number</label>
                                    <input
                                        name="gst"
                                        value={formData.gst || ''}
                                        onChange={handleChange}
                                        className="form-control font-monospace text-uppercase"
                                        placeholder="Enter GST number"
                                    />
                                </div>

                                <div className="col-12">
                                    <label className="form-label text-muted small fw-bold">Email Address</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="form-control"
                                        placeholder="Enter email address"
                                    />
                                </div>

                                <div className="col-12">
                                    <label className="form-label text-muted small fw-bold">Address</label>
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        className="form-control"
                                        placeholder="Enter full address"
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer border-top-0">
                            <button type="button" onClick={onClose} className="btn btn-secondary">
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary d-flex align-items-center gap-2">
                                <Save size={18} />
                                Save Customer
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CustomerModal;
