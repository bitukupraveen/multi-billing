import React, { useState, useEffect } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import type { ExpenseItem } from '../types';

interface ExpenseItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: ExpenseItem) => Promise<void>;
    item: ExpenseItem | null;
}

const ExpenseItemModal: React.FC<ExpenseItemModalProps> = ({ isOpen, onClose, onSave, item }) => {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [defaultPrice, setDefaultPrice] = useState<number | ''>('');
    const [taxRate, setTaxRate] = useState<number | ''>('');
    const [hsnCode, setHsnCode] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<'active' | 'inactive'>('active');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (item) {
            setTitle(item.title);
            setCategory(item.category);
            setDefaultPrice(item.defaultPrice || '');
            setTaxRate(item.taxRate || '');
            setHsnCode(item.hsnCode || '');
            setDescription(item.description || '');
            setStatus(item.status || 'active');
        } else {
            // Reset form
            setTitle('');
            setCategory('');
            setDefaultPrice('');
            setTaxRate('');
            setHsnCode('');
            setDescription('');
            setStatus('active');
        }
        setError('');
    }, [item, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            setError('Title is required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const newItem: ExpenseItem = {
                id: item?.id || '', // ID will be handled by Firestore for new items usually
                title,
                category,
                defaultPrice: Number(defaultPrice) || 0,
                taxRate: Number(taxRate) || 0,
                hsnCode,
                description,
                status
            };

            await onSave(newItem);
            onClose();
        } catch (err) {
            console.error(err);
            setError('Failed to save expense item');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content shadow-lg border-0">
                    <div className="modal-header bg-primary text-white">
                        <h5 className="modal-title fw-bold">
                            {item ? 'Edit Expense Item' : 'New Expense Item'}
                        </h5>
                        <button
                            type="button"
                            className="btn-close btn-close-white"
                            onClick={onClose}
                        ></button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="modal-body p-4">
                            {error && (
                                <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
                                    <AlertCircle size={18} />
                                    {error}
                                </div>
                            )}

                            <div className="mb-3">
                                <label className="form-label fw-medium">Title <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Office Rent, Electricity Bill"
                                    required
                                />
                            </div>

                            <div className="row g-3 mb-3">
                                <div className="col-md-6">
                                    <label className="form-label fw-medium">Category</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        placeholder="Category"
                                        list="expenseCategories"
                                    />
                                    <datalist id="expenseCategories">
                                        <option value="Office" />
                                        <option value="Utilities" />
                                        <option value="Rent" />
                                        <option value="Salary" />
                                        <option value="Maintenance" />
                                        <option value="Marketing" />
                                    </datalist>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-medium">Default Amount (₹)</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={defaultPrice}
                                        onChange={(e) => setDefaultPrice(parseFloat(e.target.value) || '')}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-medium">Def. Tax %</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={taxRate}
                                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || '')}
                                        placeholder="0"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label fw-medium">HSN Code</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={hsnCode}
                                    onChange={(e) => setHsnCode(e.target.value)}
                                    placeholder="HSN Code"
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label fw-medium">Description</label>
                                <textarea
                                    className="form-control"
                                    rows={3}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Optional details..."
                                ></textarea>
                            </div>

                            <div className="mb-3">
                                <label className="form-label fw-medium d-block">Status</label>
                                <div className="btn-group w-100" role="group">
                                    <input
                                        type="radio"
                                        className="btn-check"
                                        name="status"
                                        id="status-active"
                                        checked={status === 'active'}
                                        onChange={() => setStatus('active')}
                                    />
                                    <label className="btn btn-outline-success" htmlFor="status-active">Active</label>

                                    <input
                                        type="radio"
                                        className="btn-check"
                                        name="status"
                                        id="status-inactive"
                                        checked={status === 'inactive'}
                                        onChange={() => setStatus('inactive')}
                                    />
                                    <label className="btn btn-outline-secondary" htmlFor="status-inactive">Inactive</label>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer bg-light">
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary d-flex align-items-center gap-2"
                                disabled={loading}
                            >
                                {loading ? <div className="spinner-border spinner-border-sm"></div> : <Save size={18} />}
                                {item ? 'Update Item' : 'Create Item'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ExpenseItemModal;
