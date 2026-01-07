import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import type { Product } from '../types';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (product: Product) => void;
    product: Product | null;
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, product }) => {
    const initialState: Product = {
        id: '',
        sku: '',
        title: '',
        category: '',
        mrp: 0,
        purchasePrice: 0,
        salePrice: 0,
        image: '',
        quantity: 0,
        hsnCode: '',
        gstRate: 0
    };

    const [formData, setFormData] = useState<Product>(initialState);

    useEffect(() => {
        if (product) {
            setFormData(product);
        } else {
            setFormData({ ...initialState, id: crypto.randomUUID() });
        }
    }, [product, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' || name === 'gstRate' ? parseFloat(value) || 0 : value
        }));
    };

    return (
        <>
            <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1} role="dialog">
                <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                    <div className="modal-content shadow-lg border-0">
                        <div className="modal-header border-bottom-0">
                            <h5 className="modal-title fw-bold">{product ? 'Edit Product' : 'Add New Product'}</h5>
                            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label text-muted small fw-bold">Product Title</label>
                                        <input
                                            required
                                            name="title"
                                            value={formData.title}
                                            onChange={handleChange}
                                            className="form-control"
                                            placeholder="e.g. Premium Wireless Headphones"
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label text-muted small fw-bold">SKU</label>
                                        <input
                                            required
                                            name="sku"
                                            value={formData.sku}
                                            onChange={handleChange}
                                            className="form-control font-monospace"
                                            placeholder="e.g. WH-1000XM4"
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label text-muted small fw-bold">Category</label>
                                        <input
                                            required
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                            className="form-control"
                                            placeholder="e.g. Electronics"
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label text-muted small fw-bold">Stock Quantity</label>
                                        <input
                                            required
                                            type="number"
                                            name="quantity"
                                            value={formData.quantity}
                                            onChange={handleChange}
                                            className="form-control"
                                            min="0"
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label text-muted small fw-bold">HSN Code</label>
                                        <input
                                            name="hsnCode"
                                            value={formData.hsnCode || ''}
                                            onChange={handleChange}
                                            className="form-control font-monospace"
                                            placeholder="e.g. 8518"
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label text-muted small fw-bold">GST Rate (%)</label>
                                        <select
                                            name="gstRate"
                                            value={formData.gstRate}
                                            onChange={(e) => handleChange(e as any)}
                                            className="form-select"
                                        >
                                            <option value="0">0%</option>
                                            <option value="5">5%</option>
                                            <option value="12">12%</option>
                                            <option value="18">18%</option>
                                            <option value="28">28%</option>
                                        </select>
                                    </div>

                                    <div className="col-12">
                                        <div className="card bg-light border-0">
                                            <div className="card-body">
                                                <div className="row g-3">
                                                    <div className="col-md-4">
                                                        <label className="form-label text-muted small fw-bold">MRP</label>
                                                        <input
                                                            required
                                                            type="number"
                                                            name="mrp"
                                                            value={formData.mrp}
                                                            onChange={handleChange}
                                                            className="form-control"
                                                            min="0"
                                                            step="0.01"
                                                        />
                                                    </div>
                                                    <div className="col-md-4">
                                                        <label className="form-label text-muted small fw-bold">Purchase Price</label>
                                                        <input
                                                            required
                                                            type="number"
                                                            name="purchasePrice"
                                                            value={formData.purchasePrice}
                                                            onChange={handleChange}
                                                            className="form-control"
                                                            min="0"
                                                            step="0.01"
                                                        />
                                                    </div>
                                                    <div className="col-md-4">
                                                        <label className="form-label text-muted small fw-bold">Sale Price</label>
                                                        <input
                                                            required
                                                            type="number"
                                                            name="salePrice"
                                                            value={formData.salePrice}
                                                            onChange={handleChange}
                                                            className="form-control border-primary text-primary fw-bold"
                                                            min="0"
                                                            step="0.01"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label text-muted small fw-bold">Image URL</label>
                                        <input
                                            name="image"
                                            value={formData.image}
                                            onChange={handleChange}
                                            className="form-control"
                                            placeholder="https://example.com/image.jpg"
                                        />
                                        {formData.image && (
                                            <div className="mt-3 bg-light rounded d-flex align-items-center justify-content-center border" style={{ height: '200px' }}>
                                                <img src={formData.image} alt="Preview" className="h-100 object-fit-contain" onError={(e) => (e.currentTarget.src = '')} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer border-top-0">
                                <button type="button" onClick={onClose} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary d-flex align-items-center gap-2">
                                    <Save size={18} />
                                    Save Product
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProductModal;
