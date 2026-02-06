import React, { useMemo } from 'react';
import { Loader } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import type { Product, PurchaseBill, Invoice } from '../types';

interface ProductHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onAdjustItem: (product: Product) => void;
}

interface Transaction {
    id: string;
    type: 'Purchase' | 'Sale';
    date: string; // ISO string
    entityName: string; // Vendor or Customer
    invoiceRef: string; // Invoice ID or Bill ID
    quantity: number;
    pricePerUnit: number;
    totalAmount: number;
    status: string; // Paid, etc. (assuming 'Paid' for now as checked from screenshot)
}

const ProductHistoryModal: React.FC<ProductHistoryModalProps> = ({ isOpen, onClose, product, onAdjustItem }) => {
    // We fetch all bills and invoices. 
    // Optimization Note: In a production app with large data, we should likely index items by productId 
    // or use a dedicated transactions collection.
    const { data: purchaseBills, loading: loadingBills } = useFirestore<PurchaseBill>('purchase_bills');
    const { data: invoices, loading: loadingInvoices } = useFirestore<Invoice>('invoices');

    const transactions: Transaction[] = useMemo(() => {
        if (!product) return [];

        const history: Transaction[] = [];

        // Process Purchase Bills
        purchaseBills.forEach(bill => {
            const item = bill.items.find(i => i.productId === product.id);
            if (item) {
                history.push({
                    id: `pur-${bill.id}`,
                    type: 'Purchase',
                    date: bill.date,
                    entityName: bill.vendorName,
                    invoiceRef: bill.id,
                    quantity: item.quantity,
                    pricePerUnit: item.price,
                    totalAmount: item.total,
                    status: 'Paid' // Placeholder as verified from screenshot "Paid"
                });
            }
        });

        // Process Sales Invoices
        // Note: InvoiceItem has productId.
        invoices.forEach(inv => {
            const item = inv.items.find(i => i.productId === product.id);
            if (item) {
                history.push({
                    id: `sale-${inv.id}`,
                    type: 'Sale',
                    date: inv.date,
                    entityName: inv.customerName,
                    invoiceRef: inv.id,
                    quantity: item.quantity,
                    pricePerUnit: item.price,
                    totalAmount: item.total,
                    status: 'Paid' // Placeholder
                });
            }
        });

        // Sort by date desc
        return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [product, purchaseBills, invoices]);

    const { totalPurchased, totalSold, totalSpent, totalRevenue } = useMemo(() => {
        return transactions.reduce((acc, tx) => {
            if (tx.type === 'Purchase') {
                acc.totalPurchased += tx.quantity;
                acc.totalSpent += tx.totalAmount;
            } else {
                acc.totalSold += tx.quantity;
                acc.totalRevenue += tx.totalAmount;
            }
            return acc;
        }, { totalPurchased: 0, totalSold: 0, totalSpent: 0, totalRevenue: 0 });
    }, [transactions]);

    if (!isOpen || !product) return null;

    const isLoading = loadingBills || loadingInvoices;
    const stockValue = product.salePrice * product.quantity;

    return (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content shadow-lg border-0">
                    <div className="modal-header border-bottom py-3">
                        <div className="d-flex align-items-center gap-3">
                            <h5 className="modal-title fw-bold mb-0 text-uppercase">{product.title}</h5>
                            <button className="btn btn-sm btn-outline-primary fw-bold" onClick={() => onAdjustItem(product)}>
                                <span className="d-flex align-items-center gap-1">
                                    ADJUST ITEM
                                </span>
                            </button>
                        </div>
                        <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
                    </div>

                    <div className="modal-body bg-light">
                        {/* Summary Cards */}
                        <div className="row g-3 mb-4">
                            <div className="col-md-3 col-6">
                                <div className="card border-0 shadow-sm h-100">
                                    <div className="card-body p-3">
                                        <div className="text-muted small fw-bold text-uppercase mb-1">Stock Status</div>
                                        <div className="d-flex justify-content-between align-items-baseline">
                                            <div className="h5 mb-0">{product.quantity} <span className="small text-muted fw-normal">Units</span></div>
                                            <div className="small text-success fw-bold">₹{stockValue.toFixed(0)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3 col-6">
                                <div className="card border-0 shadow-sm h-100">
                                    <div className="card-body p-3">
                                        <div className="text-muted small fw-bold text-uppercase mb-1">Total Purchased</div>
                                        <div className="d-flex justify-content-between align-items-baseline">
                                            <div className="h5 mb-0 text-primary">{totalPurchased} <span className="small text-muted fw-normal">Units</span></div>
                                            <div className="small text-muted">₹{totalSpent.toFixed(0)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3 col-6">
                                <div className="card border-0 shadow-sm h-100">
                                    <div className="card-body p-3">
                                        <div className="text-muted small fw-bold text-uppercase mb-1">Total Sold</div>
                                        <div className="d-flex justify-content-between align-items-baseline">
                                            <div className="h5 mb-0 text-success">{totalSold} <span className="small text-muted fw-normal">Units</span></div>
                                            <div className="small text-muted">₹{totalRevenue.toFixed(0)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3 col-6">
                                <div className="card border-0 shadow-sm h-100">
                                    <div className="card-body p-3">
                                        <div className="text-muted small fw-bold text-uppercase mb-1">Prices (Excl)</div>
                                        <div className="d-flex flex-column">
                                            <div className="small text-danger">Buy: ₹{product.purchasePrice.toFixed(2)}</div>
                                            <div className="small text-success">Sell: ₹{product.salePrice.toFixed(2)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Transactions Table */}
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white py-3 border-bottom">
                                <h6 className="mb-0 fw-bold text-uppercase text-secondary">Transactions</h6>
                            </div>
                            <div className="card-body p-0">
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0">
                                        <thead className="bg-light text-secondary small text-uppercase">
                                            <tr>
                                                <th className="ps-4 py-3" style={{ width: '50px' }}></th>
                                                <th className="py-3">Type</th>
                                                <th className="py-3">Invoice/Ref</th>
                                                <th className="py-3">Name</th>
                                                <th className="py-3">Date</th>
                                                <th className="py-3">Quantity</th>
                                                <th className="py-3 text-end">Price / Unit</th>
                                                <th className="py-3 text-end pe-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {isLoading ? (
                                                <tr>
                                                    <td colSpan={8} className="text-center py-5">
                                                        <Loader className="animate-spin text-primary" />
                                                    </td>
                                                </tr>
                                            ) : transactions.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="text-center py-5 text-muted">
                                                        No transactions found for this product.
                                                    </td>
                                                </tr>
                                            ) : (
                                                transactions.map((tx) => (
                                                    <tr key={tx.id}>
                                                        <td className="ps-4">
                                                            <div className={`rounded-circle d-flex align-items-center justify-content-center ${tx.type === 'Sale' ? 'bg-success-subtle text-success' : 'bg-primary-subtle text-primary'
                                                                }`} style={{ width: '10px', height: '10px' }}>
                                                                {/* Dot indicator */}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className={tx.type === 'Sale' ? 'text-success fw-medium' : 'text-primary fw-medium'}>
                                                                {tx.type}
                                                            </span>
                                                        </td>
                                                        <td className="font-monospace small text-muted">
                                                            {tx.invoiceRef}
                                                        </td>
                                                        <td>
                                                            <span className="d-block text-truncate" style={{ maxWidth: '200px' }}>
                                                                {tx.entityName}
                                                            </span>
                                                        </td>
                                                        <td>{new Date(tx.date).toLocaleDateString()}</td>
                                                        <td>
                                                            {tx.quantity} Pcs
                                                        </td>
                                                        <td className="text-end">
                                                            ₹{tx.pricePerUnit.toFixed(2)}
                                                        </td>
                                                        <td className="text-end pe-4">
                                                            <span className="badge bg-light text-dark border">
                                                                {tx.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductHistoryModal;
