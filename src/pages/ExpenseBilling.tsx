import React, { useState, useEffect } from 'react';
import { Trash2, Save, Loader, Search, Plus } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import type { ExpenseItem, ExpenseBill } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../firebase/config';
// import { generateNextPurchaseId } from '../utils/invoiceUtils';

// Temporary interface for cart items in Expense Billing
interface ExpenseCartItem {
    expenseItemId: string;
    title: string;
    category: string;
    description?: string;

    // Detailed fields
    quantity: number;
    unitPrice: number;
    discount: number; // Absolute amount
    taxRate: number; // Percentage

    // Calculated fields (for display/storage)
    taxAmount: number;
    amount: number; // Total
}

const ExpenseBilling: React.FC = () => {
    const { data: expenseItems, loading: itemsLoading } = useFirestore<ExpenseItem>('expense_items');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('id');

    const [cart, setCart] = useState<ExpenseCartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [vendorName, setVendorName] = useState(''); // Who is getting paid
    const [sellerGstNo, setSellerGstNo] = useState('');
    const [orderNo, setOrderNo] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [shippingCharges, setShippingCharges] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [processing, setProcessing] = useState(false);

    // Load data if editing
    useEffect(() => {
        if (editId) {
            const loadBill = async () => {
                const docRef = doc(db, 'expense_bills', editId);
                const { getDoc } = await import('firebase/firestore');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as ExpenseBill;
                    setVendorName(data.vendorName);
                    setSellerGstNo(data.sellerGstNo || '');
                    setOrderNo(data.orderNo || '');
                    setInvoiceDate(data.date.split('T')[0]);
                    setNotes(data.notes || '');
                    setShippingCharges(data.shippingCharges || 0);
                    setPaymentMethod(data.paymentMethod || 'Cash');

                    // Reconstruct cart items
                    const loadedItems = data.items.map(item => ({
                        expenseItemId: item.expenseItemId,
                        title: item.expenseItemName,
                        category: '', // Not strictly needed for cart display if we don't want to double fetch
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        discount: item.discount,
                        taxRate: item.taxRate,
                        taxAmount: item.taxAmount,
                        amount: item.amount
                    }));
                    setCart(loadedItems);
                }
            };
            loadBill();
        }
    }, [editId]);

    const handleGenerateBill = async () => {
        if (cart.length === 0) return alert('Cart is empty');
        if (!vendorName) return alert('Payee/Vendor name is required');

        setProcessing(true);
        try {
            // reusing generateNextPurchaseId for now, or we could make a specific one like EXP-001
            // For now, let's prefix or use the same logic but maybe modify the function later if needed.
            // Using a simple timestamp/random ID for expenses might be easier if sequential isn't strict.
            // But let's stick to the pattern. Let's assume we want a unique ID. 
            // We'll use a custom ID generation here for simplicity "EXP-{timestamp}"
            const billId = editId || `EXP-${Date.now()}`;

            const cartTotal = cart.reduce((sum, item) => sum + Number(item.amount), 0);
            const totalAmount = cartTotal + shippingCharges;

            const bill: ExpenseBill = {
                id: billId,
                date: new Date(invoiceDate).toISOString(),
                vendorName: vendorName,
                sellerGstNo: sellerGstNo,
                orderNo: orderNo,
                items: cart.map(item => ({
                    expenseItemId: item.expenseItemId,
                    expenseItemName: item.title,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discount: item.discount,
                    taxRate: item.taxRate,
                    taxAmount: item.taxAmount,
                    amount: item.amount
                })),
                totalAmount: totalAmount,
                shippingCharges: shippingCharges,
                notes: notes,
                paymentMethod: paymentMethod,
                uploadDate: new Date().toISOString()
            };

            await setDoc(doc(db, 'expense_bills', billId), bill);

            if (!editId) {
                setCart([]);
                setVendorName('');
                setNotes('');
                setShippingCharges(0);
                setInvoiceDate(new Date().toISOString().split('T')[0]);
                alert(`Expense Bill ${billId} saved successfully!`);
            } else {
                alert(`Expense Bill ${billId} updated successfully!`);
                navigate('/expenses/history'); // We'll need to confirm this route
            }
        } catch (error) {
            console.error(error);
            alert('Error saving expense bill');
        } finally {
            setProcessing(false);
        }
    };

    const addToCart = (item: ExpenseItem) => {
        // Allow adding multiple of the same type? Yes, maybe different descriptions.
        const qty = 1;
        const price = item.defaultPrice || 0;
        const discount = 0;
        const taxRate = item.taxRate || 0;

        const grossAmount = price * qty;
        const taxableValue = grossAmount - discount;
        const taxAmt = taxableValue * (taxRate / 100);
        const total = taxableValue + taxAmt;

        setCart([...cart, {
            expenseItemId: item.id,
            title: item.title,
            category: item.category,
            description: item.description || '',
            quantity: qty,
            unitPrice: price,
            discount: discount,
            taxRate: taxRate,
            taxAmount: taxAmt,
            amount: total
        }]);
    };

    const removeFromCart = (index: number) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    const updateCartItem = (index: number, field: keyof ExpenseCartItem, value: string | number) => {
        setCart(cart.map((item, i) => {
            if (i === index) {
                const newItem = { ...item, [field]: value };

                // Recalculate totals whenever a field changes
                const qty = Number(newItem.quantity) || 0;
                const price = Number(newItem.unitPrice) || 0;
                const discount = Number(newItem.discount) || 0;
                const taxRate = Number(newItem.taxRate) || 0;

                // Logic based on User Request:
                // Total Unit Price = Unit Price * Qty
                // Net Amount = Total Unit Price - Discount (This is Taxable Value)
                // Tax Amount = Net Amount * (Tax % / 100)
                // Line Total (hidden but needed for grand total) = Net Amount + Tax Amount

                const grossAmount = price * qty; // Total Unit Price
                const taxableValue = grossAmount - discount; // Net Amount
                const taxAmt = taxableValue * (taxRate / 100);
                const total = taxableValue + taxAmt; // Grand Total for line

                return {
                    ...newItem,
                    taxAmount: taxAmt,
                    amount: total
                };
            }
            return item;
        }));
    };

    const filteredItems = expenseItems.filter(item =>
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const subTotal = cart.reduce((sum, item) => sum + ((item.unitPrice * item.quantity) - item.discount), 0);
    const totalTax = cart.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalDiscount = cart.reduce((sum, item) => sum + item.discount, 0);

    if (itemsLoading) {
        return <div className="d-flex justify-content-center align-items-center h-100"><Loader className="animate-spin" /></div>;
    }

    return (
        <div className="row g-4 h-100">
            {/* Expense Item Selection */}
            <div className="col-lg-5 d-flex flex-column h-100">
                <div className="card shadow-sm border-0 flex-fill overflow-hidden">
                    <div className="card-header bg-white border-bottom-0 pt-3">
                        <h6 className="card-title fw-bold mb-2">Select Expense Type</h6>
                        <div className="input-group">
                            <span className="input-group-text bg-light border-end-0">
                                <Search className="text-secondary" size={20} />
                            </span>
                            <input
                                type="text"
                                placeholder="Search expense types..."
                                className="form-control border-start-0 bg-light"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="card-body overflow-auto p-3">
                        <div className="d-flex flex-column gap-2">
                            {filteredItems.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => addToCart(item)}
                                    className="p-3 border rounded d-flex align-items-center justify-content-between cursor-pointer hover-bg-light transition"
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div>
                                        <p className="mb-0 fw-medium text-dark">{item.title}</p>
                                        <span className="badge bg-light text-secondary border">{item.category}</span>
                                    </div>
                                    <div className="text-end">
                                        <Plus size={18} className="text-primary" />
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
                            <h5 className="card-title fw-bold mb-0">Record Expense</h5>
                            <input
                                type="date"
                                className="form-control form-control-sm w-auto"
                                value={invoiceDate}
                                onChange={(e) => setInvoiceDate(e.target.value)}
                            />
                        </div>
                        <div className="row g-2">
                            <div className="col-md-8">
                                <input
                                    className="form-control"
                                    placeholder="Payee / Vendor Name"
                                    value={vendorName}
                                    onChange={e => setVendorName(e.target.value)}
                                />
                                <div className="row g-2 mt-2">
                                    <div className="col-6">
                                        <input
                                            className="form-control form-control-sm"
                                            placeholder="Seller GST No."
                                            value={sellerGstNo}
                                            onChange={e => setSellerGstNo(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-6">
                                        <input
                                            className="form-control form-control-sm"
                                            placeholder="Order No."
                                            value={orderNo}
                                            onChange={e => setOrderNo(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <select
                                    className="form-select"
                                    value={paymentMethod}
                                    onChange={e => setPaymentMethod(e.target.value)}
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Card">Card</option>
                                    <option value="Cheque">Cheque</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="card-body overflow-auto p-0">
                        <table className="table table-hover mb-0" style={{ fontSize: '0.9rem' }}>
                            <thead className="table-light sticky-top">
                                <tr>
                                    <th className="ps-3 border-0">Item</th>
                                    <th className="border-0 text-center" style={{ width: '70px' }}>Tax %</th>
                                    <th className="border-0 text-end" style={{ width: '100px' }}>Unit Price</th>
                                    <th className="border-0 text-center" style={{ width: '70px' }}>Qty</th>
                                    <th className="border-0 text-end" style={{ width: '110px' }}>Total Price</th>
                                    <th className="border-0 text-end" style={{ width: '90px' }}>Discount</th>
                                    <th className="text-end border-0" style={{ width: '110px' }}>Net Amount</th>
                                    <th className="border-0" style={{ width: '30px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.map((item, index) => {
                                    const totalUnitPrice = item.unitPrice * item.quantity;
                                    const netAmount = totalUnitPrice - item.discount;

                                    return (
                                        <tr key={index}>
                                            <td className="ps-3 align-middle">
                                                <div className="fw-medium text-truncate" style={{ maxWidth: '150px' }} title={item.title}>
                                                    {item.title}
                                                </div>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm mt-1"
                                                    value={item.description || ''}
                                                    onChange={(e) => updateCartItem(index, 'description', e.target.value)}
                                                    placeholder="Desc..."
                                                    style={{ fontSize: '0.8rem' }}
                                                />
                                            </td>
                                            <td className="align-middle">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="form-control form-control-sm text-center px-1"
                                                    value={item.taxRate}
                                                    onChange={(e) => updateCartItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="align-middle">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="form-control form-control-sm text-end px-1"
                                                    value={item.unitPrice}
                                                    onChange={(e) => updateCartItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="align-middle">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="form-control form-control-sm text-center px-1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateCartItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="align-middle text-end text-muted small">
                                                {totalUnitPrice.toFixed(2)}
                                            </td>
                                            <td className="align-middle">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="form-control form-control-sm text-end px-1"
                                                    value={item.discount}
                                                    onChange={(e) => updateCartItem(index, 'discount', parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="align-middle text-end fw-bold">
                                                {netAmount.toFixed(2)}
                                            </td>
                                            <td className="align-middle text-end pe-3">
                                                <button
                                                    onClick={() => removeFromCart(index)}
                                                    className="btn btn-sm btn-link text-danger p-0"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="card-footer bg-white border-top p-3">
                        <div className="mb-3" style={{ display: 'none' }}>
                            <label className="form-label small text-muted">Notes</label>
                            <textarea
                                className="form-control form-control-sm"
                                rows={2}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            ></textarea>
                        </div>

                        <div className="d-flex justify-content-between mb-2">
                            <span className="text-muted">Subtotal (Taxable)</span>
                            <span className="fw-medium">₹{subTotal.toFixed(2)}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                            <span className="text-muted">Total Tax</span>
                            <span className="fw-medium">₹{totalTax.toFixed(2)}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2 align-items-center">
                            <span className="text-muted">Shipping Charges</span>
                            <div className="input-group input-group-sm" style={{ width: '120px' }}>
                                <span className="input-group-text bg-light border-end-0">₹</span>
                                <input
                                    type="number"
                                    min="0"
                                    className="form-control border-start-0 text-end"
                                    value={shippingCharges}
                                    onChange={(e) => setShippingCharges(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                            <span className="text-muted">Total Discount</span>
                            <span className="fw-medium text-success">-₹{totalDiscount.toFixed(2)}</span>
                        </div>
                        <div className="d-flex justify-content-between h4 fw-bold text-danger mt-2 pt-2 border-top">
                            <span>Grand Total</span>
                            <span>₹{(cart.reduce((sum, item) => sum + Number(item.amount), 0) + shippingCharges).toFixed(2)}</span>
                        </div>

                        <div className="d-flex gap-2 mt-4">
                            <button onClick={handleGenerateBill} className="btn btn-danger w-100 d-flex align-items-center justify-content-center gap-2" disabled={processing}>
                                {processing ? <Loader size={18} className="animate-spin" /> : <Save size={18} />} Save Expense
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpenseBilling;
