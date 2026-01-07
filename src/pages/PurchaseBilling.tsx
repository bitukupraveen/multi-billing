import React, { useState, useEffect } from 'react';
import { Trash2, Save, Loader, Search } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import type { Product, CartItem, PurchaseBill } from '../types';
import { generateNextPurchaseId } from '../utils/invoiceUtils';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../firebase/config';
import InvoicePreviewModal from '../components/InvoicePreviewModal';

const PurchaseBilling: React.FC = () => {
    const { data: products, loading: productsLoading, update: updateProduct } = useFirestore<Product>('products');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('id');

    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [vendorName, setVendorName] = useState('');
    const [deliveryCharges, setDeliveryCharges] = useState<number>(0);
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [processing, setProcessing] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Load data if editing
    useEffect(() => {
        if (editId) {
            const loadBill = async () => {
                const docRef = doc(db, 'purchase_bills', editId);
                // Note: In a real app we might want a getDoc helper or usage of useFirestore single doc pattern
                // For now, fetching directly for simplicity
                const { getDoc } = await import('firebase/firestore');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as PurchaseBill;
                    setVendorName(data.vendorName);
                    setDeliveryCharges(data.deliveryCharges);
                    setInvoiceDate(data.date.split('T')[0]);

                    // Reconstruct cart items
                    const loadedItems = data.items.map(item => ({
                        id: item.productId,
                        sku: '',
                        title: item.productName,
                        category: '',
                        mrp: item.mrp || 0,
                        purchasePrice: item.price,
                        salePrice: 0,
                        image: '',
                        quantity: item.quantity,
                        gstRate: item.tax || 0,
                        discount: item.discount || 0
                    } as CartItem));
                    setCart(loadedItems);
                }
            };
            loadBill();
        }
    }, [editId]);

    const handleGenerateBill = async () => {
        if (cart.length === 0) return alert('Cart is empty');
        if (!vendorName) return alert('Vendor name is required');

        setProcessing(true);
        try {
            const billId = editId || await generateNextPurchaseId();

            const subTotal = cart.reduce((sum, item) => sum + (Number(item.purchasePrice) * (1 - Number(item.discount) / 100) * item.quantity), 0);
            const taxTotal = cart.reduce((sum, item) => sum + ((Number(item.purchasePrice) * (1 - Number(item.discount) / 100) * item.quantity) * (Number(item.gstRate) / 100)), 0);
            const totalAmount = subTotal + taxTotal + deliveryCharges;

            const bill: PurchaseBill = {
                id: billId,
                date: new Date(invoiceDate).toISOString(),
                customerId: 'VENDOR',
                customerName: 'VENDOR',
                vendorName: vendorName,
                deliveryCharges: deliveryCharges,
                items: cart.map(item => ({
                    productId: item.id,
                    productName: item.title,
                    quantity: item.quantity,
                    mrp: Number(item.mrp),
                    price: Number(item.purchasePrice),
                    discount: Number(item.discount),
                    tax: Number(item.gstRate),
                    total: (Number(item.purchasePrice) * (1 - Number(item.discount) / 100) * item.quantity) * (1 + Number(item.gstRate) / 100)
                })),
                subTotal: subTotal,
                tax: taxTotal,
                totalAmount: totalAmount
            };

            await setDoc(doc(db, 'purchase_bills', billId), bill);

            // Update Stock
            // Warning: Simple stock update. Editing a bill *again* would re-add stock if we aren't careful.
            // For this implementation, assuming editing doesn't revert old stock changes automatically (complex logic).
            // We will only add stock for NEW bills.
            if (!editId) {
                for (const item of cart) {
                    const product = products.find(p => p.id === item.id);
                    if (product) {
                        const newQty = product.quantity + item.quantity;
                        await updateProduct(product.id, { quantity: newQty });
                    }
                }
            }

            if (!editId) {
                setCart([]);
                setVendorName('');
                setDeliveryCharges(0);
                setInvoiceDate(new Date().toISOString().split('T')[0]);
                alert(`Purchase Bill ${billId} generated successfully!`);
            } else {
                alert(`Purchase Bill ${billId} updated successfully!`);
                navigate('/purchase-bills');
            }
        } catch (error) {
            console.error(error);
            alert('Error saving bill');
        } finally {
            setProcessing(false);
        }
    };

    // Calculate totals
    const updateCartItem = (id: string, field: keyof CartItem, value: string | number) => {
        setCart(cart.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const addToCart = (product: Product) => {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            setCart(cart.map(item =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            ));
        } else {
            // Note: For purchase, we might want to default Purchase Price, but keep Sale Price as is or allow edit?
            // Focused on Cost editing here.
            setCart([...cart, { ...product, quantity: 1, discount: 0 }]);
        }
    };

    const removeFromCart = (id: string) => {
        setCart(cart.filter(item => item.id !== id));
    };

    const calculateItemTotal = (item: CartItem) => {
        // Purchase cost usually doesn't have "discount" field from vendor in this simple UI, but user asked for it.
        // Assuming Logic: Cost = (PurchasePrice - Discount%) + Tax
        const purchasePrice = Number(item.purchasePrice) || 0;
        const discount = Number(item.discount) || 0;
        const gstRate = Number(item.gstRate) || 0;

        const priceAfterDiscount = purchasePrice * (1 - discount / 100);
        const totalBeforeTax = priceAfterDiscount * item.quantity;
        const taxAmount = totalBeforeTax * (gstRate / 100);
        return totalBeforeTax + taxAmount;
    };

    const subTotal = cart.reduce((sum, item) => sum + (Number(item.purchasePrice) * (1 - Number(item.discount) / 100) * item.quantity), 0);
    const taxTotal = cart.reduce((sum, item) => sum + ((Number(item.purchasePrice) * (1 - Number(item.discount) / 100) * item.quantity) * (Number(item.gstRate) / 100)), 0);
    const total = subTotal + taxTotal + deliveryCharges;

    const filteredProducts = products.filter(p =>
        p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (productsLoading) {
        return <div className="d-flex justify-content-center align-items-center h-100"><Loader className="animate-spin" /></div>;
    }

    return (
        <div className="row g-4 h-100">
            {/* Product Selection */}
            <div className="col-lg-5 d-flex flex-column h-100">
                {/* ... Left Side ... */}
                <div className="card shadow-sm border-0 flex-fill overflow-hidden">
                    <div className="card-header bg-white border-bottom-0 pt-3">
                        <div className="input-group">
                            <span className="input-group-text bg-light border-end-0">
                                <Search className="text-secondary" size={20} />
                            </span>
                            <input
                                type="text"
                                placeholder="Search products..."
                                className="form-control border-start-0 bg-light"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="card-body overflow-auto p-3">
                        <div className="d-flex flex-column gap-2">
                            {filteredProducts.map(product => (
                                <div
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    className="p-3 border rounded d-flex align-items-center justify-content-between cursor-pointer hover-bg-light transition"
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div>
                                        <p className="mb-0 fw-medium text-dark">{product.title}</p>
                                        <p className="mb-0 text-muted small">SKU: {product.sku}</p>
                                    </div>
                                    <div className="text-end">
                                        <p className="mb-0 fw-bold text-success">Cost: ₹{product.purchasePrice.toFixed(2)}</p>
                                        <p className="mb-0 text-muted small">{product.quantity} in stock</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bill Details */}
            <div className="col-lg-7 d-flex flex-column h-100">
                <div className="card shadow-sm border-0 flex-fill overflow-hidden">
                    <div className="card-header bg-white border-bottom pt-3 pb-3">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="card-title fw-bold mb-0">Purchase Bill</h5>
                            <input
                                type="date"
                                className="form-control form-control-sm w-auto"
                                value={invoiceDate}
                                onChange={(e) => setInvoiceDate(e.target.value)}
                            />
                        </div>
                        <div className="row g-2">
                            <div className="col-12">
                                <input
                                    className="form-control"
                                    placeholder="Vendor Name"
                                    value={vendorName}
                                    onChange={e => setVendorName(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="card-body overflow-auto p-0">
                        <table className="table table-hover mb-0" style={{ fontSize: '0.9rem' }}>
                            <thead className="table-light sticky-top">
                                <tr>
                                    <th className="ps-3 border-0">Item</th>
                                    <th className="border-0" style={{ width: '70px' }}>MRP</th>
                                    <th className="border-0" style={{ width: '70px' }}>Qty</th>
                                    <th className="text-end border-0" style={{ width: '80px' }}>Cost</th>
                                    <th className="border-0" style={{ width: '60px' }}>Dis%</th>
                                    <th className="border-0" style={{ width: '60px' }}>Tax%</th>
                                    <th className="text-end border-0">Total</th>
                                    <th className="border-0" style={{ width: '30px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.map(item => (
                                    <tr key={item.id}>
                                        <td className="ps-3 align-middle fw-medium" style={{ maxWidth: '120px' }}>
                                            <div className="text-truncate" title={item.title}>{item.title}</div>
                                        </td>
                                        <td className="align-middle">
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.mrp}
                                                onChange={(e) => updateCartItem(item.id, 'mrp', e.target.value)}
                                                className="form-control form-control-sm p-1"
                                            />
                                        </td>
                                        <td className="align-middle">
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => updateCartItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                                className="form-control form-control-sm text-center p-1"
                                            />
                                        </td>
                                        <td className="align-middle text-end">
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.purchasePrice}
                                                onChange={(e) => updateCartItem(item.id, 'purchasePrice', e.target.value)}
                                                className="form-control form-control-sm p-1"
                                            />
                                        </td>
                                        <td className="align-middle">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={item.discount}
                                                onChange={(e) => updateCartItem(item.id, 'discount', e.target.value)}
                                                className="form-control form-control-sm p-1"
                                            />
                                        </td>
                                        <td className="align-middle">
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.gstRate}
                                                onChange={(e) => updateCartItem(item.id, 'gstRate', e.target.value)}
                                                className="form-control form-control-sm p-1"
                                            />
                                        </td>
                                        <td className="align-middle text-end fw-bold">₹{calculateItemTotal(item).toFixed(2)}</td>
                                        <td className="align-middle text-end pe-3">
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="btn btn-sm btn-link text-danger p-0"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="card-footer bg-white border-top p-3">
                        <div className="d-flex justify-content-between mb-2">
                            <span className="text-muted">Subtotal (after dis)</span>
                            <span className="fw-medium">₹{subTotal.toFixed(2)}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                            <span className="text-muted">Tax</span>
                            <span className="fw-medium">₹{taxTotal.toFixed(2)}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                            <span className="text-muted">Delivery Charges</span>
                            <input
                                type="number"
                                min="0"
                                className="form-control form-control-sm w-auto text-end"
                                value={deliveryCharges}
                                onChange={(e) => setDeliveryCharges(parseFloat(e.target.value) || 0)}
                            />
                        </div>
                        <div className="d-flex justify-content-between h5 fw-bold text-success mt-2 pt-2 border-top">
                            <span>Total</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>

                        <div className="d-flex gap-2 mt-4">
                            <button
                                onClick={() => setShowPreview(true)}
                                className="btn btn-outline-secondary w-50 d-flex align-items-center justify-content-center gap-2"
                                disabled={processing || cart.length === 0}
                            >
                                <Save size={18} /> Print Preview
                            </button>
                            <button onClick={handleGenerateBill} className="btn btn-success w-50 d-flex align-items-center justify-content-center gap-2" disabled={processing}>
                                {processing ? <Loader size={18} className="animate-spin" /> : <Save size={18} />} Generate Bill
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <InvoicePreviewModal
                show={showPreview}
                onClose={() => setShowPreview(false)}
                data={{
                    invoiceId: editId || 'DRAFT',
                    date: invoiceDate,
                    customerName: vendorName || 'N/A', // Mapping Vendor to CustomerName for generic modal
                    customerPhone: '',
                    items: cart,
                    subTotal: subTotal,
                    tax: taxTotal,
                    deliveryCharges: deliveryCharges,
                    total: total,
                    type: 'PURCHASE'
                }}
            />
        </div>
    );
};

export default PurchaseBilling;
