import React, { useState } from 'react';
import { RefreshCw, Package, ShoppingCart, Loader, AlertCircle, CheckCircle, Search, ExternalLink } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { syncWixProducts, syncWixOrders } from '../api/wixApi';

const SimpleElectronics: React.FC = () => {
    const { data: products, add: addProduct, loading: productsLoading } = useFirestore<any>('wixProducts');
    const { data: orders, add: addOrder, loading: ordersLoading } = useFirestore<any>('wixOrders');

    const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleSync = async () => {
        setIsSyncing(true);
        setError(null);
        setSuccess(null);

        try {
            if (activeTab === 'products') {
                const result = await syncWixProducts();
                if (result.success) {
                    let added = 0;
                    for (const p of result.products) {
                        const exists = products.find(existing => existing.id === p.id);
                        if (!exists) {
                            await addProduct(p);
                            added++;
                        }
                    }
                    setSuccess(`Synced ${result.products.length} products (${added} new).`);
                }
            } else {
                const result = await syncWixOrders();
                if (result.success) {
                    let added = 0;
                    for (const o of result.orders) {
                        const exists = orders.find(existing => existing.orderId === o.orderId);
                        if (!exists) {
                            await addOrder(o);
                            added++;
                        }
                    }
                    setSuccess(`Synced ${result.orders.length} orders (${added} new).`);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Sync failed');
        } finally {
            setIsSyncing(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredOrders = orders.filter(o =>
        o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="h3 mb-0 fw-bold text-gray-800">Simple Electronics</h2>
                    <p className="text-muted mb-0">Wix eCommerce Integration</p>
                </div>
                <button
                    className={`btn ${isSyncing ? 'btn-secondary' : 'btn-primary'} d-flex align-items-center gap-2 px-4 shadow-sm`}
                    onClick={handleSync}
                    disabled={isSyncing}
                >
                    {isSyncing ? <Loader size={18} className="spinner-border spinner-border-sm" /> : <RefreshCw size={18} />}
                    Sync {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </button>
            </div>

            {error && (
                <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
                    <AlertCircle size={20} className="me-2" />
                    {error}
                </div>
            )}

            {success && (
                <div className="alert alert-success d-flex align-items-center mb-4" role="alert">
                    <CheckCircle size={20} className="me-2" />
                    {success}
                </div>
            )}

            {/* Tabs & Search */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-bottom-0 pt-3">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                        <ul className="nav nav-pills card-header-pills">
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'products' ? 'active' : 'text-dark'}`}
                                    onClick={() => { setActiveTab('products'); setSearchTerm(''); }}
                                >
                                    <Package size={18} className="me-2" />
                                    Products
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'orders' ? 'active' : 'text-dark'}`}
                                    onClick={() => { setActiveTab('orders'); setSearchTerm(''); }}
                                >
                                    <ShoppingCart size={18} className="me-2" />
                                    Orders
                                </button>
                            </li>
                        </ul>
                        <div className="position-relative" style={{ minWidth: '300px' }}>
                            <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={18} />
                            <input
                                type="text"
                                className="form-control ps-5"
                                placeholder={`Search ${activeTab}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="card-body p-0">
                    <div className="table-responsive">
                        {activeTab === 'products' ? (
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="px-4 py-3 text-secondary text-uppercase small fw-bold">Product</th>
                                        <th className="px-4 py-3 text-secondary text-uppercase small fw-bold">SKU</th>
                                        <th className="px-4 py-3 text-secondary text-uppercase small fw-bold">Price</th>
                                        <th className="px-4 py-3 text-secondary text-uppercase small fw-bold">Stock</th>
                                        <th className="px-4 py-3 text-secondary text-uppercase small fw-bold text-end">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productsLoading ? (
                                        <tr><td colSpan={5} className="text-center py-5"><Loader className="spinner-border text-primary" /></td></tr>
                                    ) : filteredProducts.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-5 text-secondary">No products found.</td></tr>
                                    ) : (
                                        filteredProducts.map(p => (
                                            <tr key={p.id}>
                                                <td className="px-4 py-3">
                                                    <div className="d-flex align-items-center gap-3">
                                                        {p.media ? <img src={p.media} alt="" className="rounded" style={{ width: '40px', height: '40px', objectFit: 'cover' }} /> : <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}><Package size={20} className="text-muted" /></div>}
                                                        <div>
                                                            <div className="fw-bold">{p.name}</div>
                                                            <small className="text-muted">ID: {p.id.slice(0, 8)}...</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">{p.sku}</td>
                                                <td className="px-4 py-3">
                                                    <div className="fw-bold">₹{p.discountedPrice?.toFixed(2)}</div>
                                                    {p.price > p.discountedPrice && <small className="text-decoration-line-through text-muted small">₹{p.price?.toFixed(2)}</small>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`badge ${typeof p.inventory === 'number' && p.inventory < 10 ? 'bg-warning' : 'bg-info'}`}>
                                                        {p.inventory}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-end">
                                                    <button className="btn btn-sm btn-outline-primary"><ExternalLink size={14} /></button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="px-4 py-3 text-secondary text-uppercase small fw-bold">Order #</th>
                                        <th className="px-4 py-3 text-secondary text-uppercase small fw-bold">Customer</th>
                                        <th className="px-4 py-3 text-secondary text-uppercase small fw-bold">Date</th>
                                        <th className="px-4 py-3 text-secondary text-uppercase small fw-bold">Status</th>
                                        <th className="px-4 py-3 text-secondary text-uppercase small fw-bold text-end">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ordersLoading ? (
                                        <tr><td colSpan={5} className="text-center py-5"><Loader className="spinner-border text-primary" /></td></tr>
                                    ) : filteredOrders.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-5 text-secondary">No orders found.</td></tr>
                                    ) : (
                                        filteredOrders.map(o => (
                                            <tr key={o.orderId}>
                                                <td className="px-4 py-3 fw-bold">{o.orderNumber}</td>
                                                <td className="px-4 py-3">{o.customer}</td>
                                                <td className="px-4 py-3 text-muted">{new Date(o.createdDate).toLocaleDateString()}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`badge ${o.status === 'COMPLETED' ? 'bg-success' : o.status === 'CANCELLED' ? 'bg-danger' : 'bg-primary'}`}>
                                                        {o.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-end fw-bold">₹{o.totalPrice?.toFixed(2)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SimpleElectronics;
