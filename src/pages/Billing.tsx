import React, { useState } from 'react';
import { Search, Trash2, Printer, Save, Loader } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import type { Product, CartItem, Customer, Invoice } from '../types';
import { generateNextInvoiceId } from '../utils/invoiceUtils';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import InvoicePreviewModal from '../components/InvoicePreviewModal';

import { useNavigate, useSearchParams } from 'react-router-dom';

const Billing: React.FC = () => {
    const { data: products, loading: productsLoading, update: updateProduct } = useFirestore<Product>('products');
    // const { add: addInvoice } = useFirestore<any>('invoices'); // No longer needed

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('id');

    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [customer, setCustomer] = useState<Customer>({
        id: '',
        name: '',
        email: '',
        phone: '',
        address: ''
    });
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [processing, setProcessing] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Extra Fields
    const [logisticsFee, setLogisticsFee] = useState<string | number>(0);
    const [marketplaceFee, setMarketplaceFee] = useState<string | number>(0);
    const [otherTax, setOtherTax] = useState<string | number>(0);
    const [refundAmount, setRefundAmount] = useState<string | number>(0);

    // Load data if editing
    React.useEffect(() => {
        if (editId) {
            const loadInvoice = async () => {
                const docRef = doc(db, 'invoices', editId);
                const { getDoc } = await import('firebase/firestore');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as Invoice;
                    setCustomer({
                        id: data.customerId,
                        name: data.customerName,
                        phone: data.customerPhone || '',
                        email: '', // Not stored in Invoice currently
                        address: '' // Not stored
                    });
                    setInvoiceDate(data.date.split('T')[0]);

                    // Reconstruct cart items
                    const loadedItems = data.items.map(item => ({
                        id: item.productId,
                        sku: '',
                        title: item.productName,
                        category: '',
                        mrp: item.mrp || 0,
                        purchasePrice: 0,
                        salePrice: item.price,
                        image: '',
                        quantity: item.quantity,
                        gstRate: item.tax || 0,
                        discount: item.discount || 0
                    } as CartItem));
                    setCart(loadedItems);
                }
            };
            loadInvoice();
        }
    }, [editId]);

    const handleGenerateInvoice = async () => {
        if (cart.length === 0) return alert('Cart is empty');
        if (!customer.name) return alert('Customer name is required');

        setProcessing(true);
        try {
            const invoiceId = editId || await generateNextInvoiceId();

            const subTotal = cart.reduce((sum, item) => sum + (Number(item.salePrice) * (1 - Number(item.discount) / 100) * item.quantity), 0);
            const taxTotal = cart.reduce((sum, item) => sum + ((Number(item.salePrice) * (1 - Number(item.discount) / 100) * item.quantity) * (Number(item.gstRate) / 100)), 0);

            const invoice: Invoice = {
                id: invoiceId,
                date: new Date(invoiceDate).toISOString(),
                customerId: customer.id || crypto.randomUUID(),
                customerName: customer.name,
                customerPhone: customer.phone,
                items: cart.map(item => ({
                    productId: item.id,
                    productName: item.title,
                    quantity: item.quantity,
                    mrp: Number(item.mrp),
                    price: Number(item.salePrice),
                    discount: Number(item.discount),
                    tax: Number(item.gstRate),
                    total: (Number(item.salePrice) * (1 - Number(item.discount) / 100) * item.quantity) * (1 + Number(item.gstRate) / 100)
                })),
                subTotal: subTotal,
                tax: taxTotal,
                // Save new fields
                logisticsFee: Number(logisticsFee),
                marketplaceFee: Number(marketplaceFee),
                otherTax: Number(otherTax),
                refundAmount: Number(refundAmount),
                totalAmount: (subTotal + taxTotal + Number(logisticsFee) + Number(otherTax)) - (Number(marketplaceFee) + Number(refundAmount))
            };

            // Create/Update Invoice
            await setDoc(doc(db, 'invoices', invoiceId), invoice);

            // Update Stock - Only for NEW invoices to avoid double deduction complexity
            if (!editId) {
                for (const item of cart) {
                    const product = products.find(p => p.id === item.id);
                    if (product) {
                        const newQty = Math.max(0, product.quantity - item.quantity);
                        await updateProduct(product.id, { quantity: newQty });
                    }
                }
            }

            if (!editId) {
                setCart([]);
                setCustomer({ id: '', name: '', email: '', phone: '', address: '' });
                setInvoiceDate(new Date().toISOString().split('T')[0]);
                alert('Invoice generated successfully!');
            } else {
                alert('Invoice updated successfully!');
                navigate('/invoices');
            }
        } catch (error) {
            console.error(error);
            alert('Error generating invoice');
        } finally {
            setProcessing(false);
        }
    };

    // Calculate totals
    const updateCartItem = (id: string, field: keyof CartItem, value: string | number) => {
        setCart(cart.map(item => {
            if (item.id === id) {
                // validation for number fields if needed, or just allow string
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
            setCart([...cart, { ...product, quantity: 1, discount: 0 }]);
        }
    };

    const removeFromCart = (id: string) => {
        setCart(cart.filter(item => item.id !== id));
    };

    const calculateItemTotal = (item: CartItem) => {
        const salePrice = Number(item.salePrice) || 0;
        const discount = Number(item.discount) || 0;
        const gstRate = Number(item.gstRate) || 0;

        const priceAfterDiscount = salePrice * (1 - discount / 100);
        const totalBeforeTax = priceAfterDiscount * item.quantity;
        const taxAmount = totalBeforeTax * (gstRate / 100);
        return totalBeforeTax + taxAmount;
    };

    const subTotal = cart.reduce((sum, item) => sum + (Number(item.salePrice) * (1 - Number(item.discount) / 100) * item.quantity), 0);
    const tax = cart.reduce((sum, item) => sum + ((Number(item.salePrice) * (1 - Number(item.discount) / 100) * item.quantity) * (Number(item.gstRate) / 100)), 0);

    // Total Calculation: + Logistics + OtherTax - MarketplaceFee - Refund
    // Wait, Marketplace Fee is usually a cost to seller, not customer?
    // User Instructions: 
    // Add (+): Logistics Fee, Taxes (Extra)
    // Deduct (-): Marketplace Fees, Refund Amount
    const total = (subTotal + tax + Number(logisticsFee) + Number(otherTax)) - (Number(marketplaceFee) + Number(refundAmount));

    const filteredProducts = products.filter(p =>
        p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (productsLoading) {
        return <div className="d-flex justify-content-center align-items-center h-100"><Loader className="animate-spin" /></div>;
    }

    return (
        <div className="row g-4 h-100">
            {/* Product Selection - Left Side */}
            <div className="col-lg-5 d-flex flex-column h-100">
                {/* ... (Left side unchanged except maybe width adjustment) ... */}
                <div className="card shadow-sm border-0 flex-fill overflow-hidden">
                    <div className="card-header bg-white border-bottom-0 pt-3">
                        <div className="input-group">
                            <span className="input-group-text bg-light border-end-0">
                                <Search className="text-secondary" size={20} />
                            </span>
                            <input
                                type="text"
                                placeholder="Search..."
                                className="form-control border-start-0 bg-light"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
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
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="bg-light rounded d-flex align-items-center justify-content-center overflow-hidden" style={{ width: '40px', height: '40px' }}>
                                            {product.image ? (
                                                <img src={product.image} alt={product.title} className="w-100 h-100 object-fit-cover" />
                                            ) : (
                                                <span className="small text-secondary">Img</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="mb-0 fw-medium text-dark">{product.title}</p>
                                            <p className="mb-0 text-muted small">SKU: {product.sku}</p>
                                        </div>
                                    </div>
                                    <div className="text-end">
                                        <p className="mb-0 fw-bold text-primary">₹{product.salePrice.toFixed(2)}</p>
                                        <p className="mb-0 text-muted small" style={{ fontSize: '0.75rem' }}>{product.quantity} in stock</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Invoice Details - Right Side */}
            <div className="col-lg-7 d-flex flex-column h-100">
                <div className="card shadow-sm border-0 flex-fill overflow-hidden">
                    <div className="card-header bg-white border-bottom pt-3 pb-3">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="card-title fw-bold mb-0">Customer Details</h5>
                            <input
                                type="date"
                                className="form-control form-control-sm w-auto"
                                value={invoiceDate}
                                onChange={(e) => setInvoiceDate(e.target.value)}
                            />
                        </div>
                        <div className="row g-2">
                            <div className="col-md-6">
                                <input
                                    className="form-control"
                                    placeholder="Customer Name"
                                    value={customer.name}
                                    onChange={e => setCustomer({ ...customer, name: e.target.value })}
                                />
                            </div>
                            <div className="col-md-6">
                                <input
                                    className="form-control"
                                    placeholder="Phone Number"
                                    value={customer.phone}
                                    onChange={e => setCustomer({ ...customer, phone: e.target.value })}
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
                                    <th className="border-0" style={{ width: '80px' }}>Price</th>
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
                                        <td className="align-middle">
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.salePrice}
                                                onChange={(e) => updateCartItem(item.id, 'salePrice', e.target.value)}
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
                                {cart.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="text-center py-5 text-muted">Cart is empty</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="card-footer bg-white border-top p-3">
                        <div className="row g-2 mb-2">
                            <div className="col-6 d-flex justify-content-between align-items-center">
                                <span className="text-muted small">Subtotal</span>
                                <span className="fw-medium">₹{subTotal.toFixed(2)}</span>
                            </div>
                            <div className="col-6 d-flex justify-content-between align-items-center">
                                <span className="text-muted small">GST Tax</span>
                                <span className="fw-medium">₹{tax.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Extra Fields Inputs */}
                        <div className="row g-2 mb-3 border-top pt-2">
                            <div className="col-md-3">
                                <label className="small text-muted">Logistics (+)</label>
                                <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    value={logisticsFee}
                                    onChange={(e) => setLogisticsFee(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="small text-muted">Taxes (+)</label>
                                <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    value={otherTax}
                                    onChange={(e) => setOtherTax(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="small text-muted">Marketplace (-)</label>
                                <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    value={marketplaceFee}
                                    onChange={(e) => setMarketplaceFee(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="small text-muted">Refund (-)</label>
                                <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    value={refundAmount}
                                    onChange={(e) => setRefundAmount(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="d-flex justify-content-between mb-2 pt-2 border-top">
                            <span className="fw-bold fs-5">Total Payable</span>
                            <span className="fw-bold fs-5 text-primary">₹{total.toFixed(2)}</span>
                        </div>
                        <div className="d-flex justify-content-between h5 fw-bold text-primary mt-2 pt-2 border-top">
                            <span>Total</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>

                        <div className="d-flex gap-2 mt-4">
                            <button
                                onClick={() => setShowPreview(true)}
                                className="btn btn-outline-secondary w-50 d-flex align-items-center justify-content-center gap-2"
                                disabled={processing || cart.length === 0}
                            >
                                <Printer size={18} /> Print Preview
                            </button>
                            <button onClick={handleGenerateInvoice} className="btn btn-primary w-50 d-flex align-items-center justify-content-center gap-2" disabled={processing}>
                                {processing ? <Loader size={18} className="animate-spin" /> : <Save size={18} />} {editId ? 'Update Invoice' : 'Generate Invoice'}
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
                    customerName: customer.name || 'N/A',
                    customerPhone: customer.phone,
                    items: cart,
                    subTotal: subTotal,
                    tax: tax,
                    logisticsFee: Number(logisticsFee),
                    marketplaceFee: Number(marketplaceFee),
                    otherTax: Number(otherTax),
                    refundAmount: Number(refundAmount),
                    total: total,
                    type: 'SALES'
                }}
            />
        </div>
    );
};

export default Billing;
