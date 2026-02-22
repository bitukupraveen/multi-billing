import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Loader, History } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import type { Product } from '../types';
import ProductModal from '../components/ProductModal';
import ProductHistoryModal from '../components/ProductHistoryModal';
import ImportModal from '../components/ImportModal';
import SyncReportsModal from '../components/SyncReportsModal';

const ProductManager: React.FC = () => {
    // Determine sort/ordering strategy or just fetch all.
    // Firestore hook expects query constraints but we can start with default (empty) which might need adjustment in the hook if not handled.
    // For now, let's just pass empty array inside hook if possible or handle it there.
    const { data: products, loading, add, update, remove } = useFirestore<Product>('products');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

    // Filter products
    const filteredProducts = products.filter(p =>
        p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this product?')) {
            await remove(id);
        }
    };

    const handleSave = async (product: Product) => {
        try {
            if (editingProduct && product.id) {
                // Remove id from object before update if necessary, or just destructure
                const { id, ...data } = product;
                await update(id, data);
            } else {
                const { id, ...data } = product; // Firestore creates its own ID or we can specify. useFirestore 'add' uses addDoc which generates ID.
                // If we want to strictly manage ID (like SKU as ID), we'd need setDoc. 
                // For now, let's stick to auto-id by firestore and ignore the client-side generated ID from Modal.
                await add(data);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving product:", error);
            alert("Failed to save product. Check console.");
        }
    };

    if (loading) {
        return <div className="d-flex justify-content-center align-items-center h-100"><Loader className="animate-spin" /></div>;
    }

    return (
        <div className="container-fluid p-0">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
                <h1 className="h3 mb-0 text-dark">All Products</h1>
                <div className="d-flex gap-2">
                    <button
                        onClick={() => setIsSyncModalOpen(true)}
                        className="btn btn-outline-info d-flex align-items-center gap-2"
                    >
                        <History size={20} />
                        Sync Reports
                    </button>
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="btn btn-outline-primary d-flex align-items-center gap-2"
                    >
                        <Plus size={20} className="rotate-45" /> {/* Simulating Upload Icon look or use simple Plus for now */}
                        Import
                    </button>
                    <button
                        onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
                        className="btn btn-primary d-flex align-items-center gap-2"
                    >
                        <Plus size={20} />
                        Add Product
                    </button>
                </div>
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-body">
                    <div className="input-group mb-4" style={{ maxWidth: '400px' }}>
                        <span className="input-group-text bg-white border-end-0">
                            <Search className="text-muted" size={20} />
                        </span>
                        <input
                            type="text"
                            placeholder="Search products..."
                            className="form-control border-start-0 ps-0"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th className="py-3">Product</th>
                                    <th className="py-3">SKU</th>
                                    <th className="py-3">Category</th>
                                    <th className="py-3">Stock</th>
                                    <th className="py-3">Price</th>
                                    <th className="py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-5 text-muted">
                                            No products found. Add your first product!
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProducts.map((product) => (
                                        <tr key={product.id}>
                                            <td>
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="bg-light rounded d-flex align-items-center justify-content-center overflow-hidden" style={{ width: '40px', height: '40px' }}>
                                                        {product.image ? (
                                                            <img src={product.image} alt={product.title} className="w-100 h-100 object-fit-cover" />
                                                        ) : (
                                                            <span className="small text-secondary">Img</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="d-block fw-medium">{product.title}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-muted font-monospace small">{product.sku}</td>
                                            <td>
                                                <div>{product.category}</div>
                                                <div className="d-flex gap-2 mt-1">
                                                    <span className="small text-muted">GST: {product.gstRate}%</span>

                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge rounded-pill ${product.quantity > 0 ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'
                                                    }`}>
                                                    {product.quantity} in stock
                                                </span>
                                                <div>
                                                    <span className={`badge ${product.status === 'inactive' ? 'text-bg-secondary' : 'text-bg-success'} rounded-pill`} style={{ fontSize: '0.7rem' }}>
                                                        {(product.status || 'active').toUpperCase()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="fw-medium">₹{product.salePrice.toFixed(2)}</td>
                                            <td>
                                                <div className="d-flex gap-2">
                                                    <button
                                                        onClick={() => { setEditingProduct(product); setIsModalOpen(true); }}
                                                        className="btn btn-sm btn-outline-secondary border-0"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setHistoryProduct(product); setIsHistoryModalOpen(true); }}
                                                        className="btn btn-sm btn-outline-primary border-0"
                                                        title="Transaction History"
                                                    >
                                                        <History size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product.id)}
                                                        className="btn btn-sm btn-outline-danger border-0"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <ProductModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                product={editingProduct}
            />

            <ProductHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                product={historyProduct}
                onAdjustItem={(product) => {
                    setIsHistoryModalOpen(false);
                    setEditingProduct(product);
                    setIsModalOpen(true);
                }}
            />

            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => { /* maybe refresh or show toast */ }}
            />

            <SyncReportsModal
                isOpen={isSyncModalOpen}
                onClose={() => setIsSyncModalOpen(false)}
                onSuccess={() => { /* Optional refresh if needed */ }}
            />
        </div>
    );
};

export default ProductManager;
