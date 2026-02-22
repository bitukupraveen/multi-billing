import React, { useState } from 'react';
import { Loader, CheckCircle, AlertCircle, RefreshCcw, X } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import type { Product, Invoice, FlipkartOrder, MeeshoOrder, InvoiceItem } from '../types';

interface SyncReportsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const SyncReportsModal: React.FC<SyncReportsModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { data: products, update: updateProduct } = useFirestore<Product>('products');
    const { data: invoices, add: addInvoice } = useFirestore<Invoice>('invoices');
    const { data: flipkartOrders } = useFirestore<FlipkartOrder>('flipkartOrders');
    const { data: meeshoOrders } = useFirestore<MeeshoOrder>('meeshoOrders');

    const [syncing, setSyncing] = useState(false);
    const [progress, setProgress] = useState<{ total: number; current: number; added: number; skipped: number; errors: number }>({
        total: 0,
        current: 0,
        added: 0,
        skipped: 0,
        errors: 0
    });
    const [finalMessage, setFinalMessage] = useState<string | null>(null);

    const handleSync = async () => {
        setSyncing(true);
        setFinalMessage(null);
        setProgress({ total: 0, current: 0, added: 0, skipped: 0, errors: 0 });

        // Identify existing orders to avoid duplicates
        const existingOrderIds = new Set(invoices.map(inv => inv.channelOrderId).filter(Boolean));

        // Prepare list of potential orders to sync
        const flipkartToSync = flipkartOrders.filter(o => o.orderItemId && !existingOrderIds.has(o.orderItemId));
        const meeshoToSync = meeshoOrders.filter(o => o.subOrderNo && !existingOrderIds.has(o.subOrderNo));

        const totalToProcess = flipkartToSync.length + meeshoToSync.length;
        setProgress(prev => ({ ...prev, total: totalToProcess }));

        let addedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        let currentCount = 0;

        // Create a map to track local quantity changes to avoid stale state
        const productQtyMap = new Map<string, number>();
        products.forEach(p => productQtyMap.set(p.id, p.quantity));

        // --- Process Flipkart Orders ---
        for (const order of flipkartToSync) {
            currentCount++;
            setProgress(prev => ({ ...prev, current: currentCount }));

            try {
                // Find matching product by SKU
                const product = products.find(p => p.sku === order.sellerSku);

                if (!product) {
                    // SKU not found in our products, skip or log
                    skippedCount++;
                    continue;
                }

                const currentQty = productQtyMap.get(product.id) ?? 0;
                const qtyToDeduct = order.quantity || 1;

                // Create Invoice Item
                const invoiceItem: InvoiceItem = {
                    productId: product.id,
                    productName: product.title,
                    quantity: qtyToDeduct,
                    mrp: product.mrp,
                    price: (order.saleAmount || 0) / qtyToDeduct, // Derived unit price
                    discount: 0,
                    tax: product.gstRate,
                    total: order.saleAmount || 0
                };

                // Create Invoice
                const newInvoice: Omit<Invoice, 'id'> = {
                    date: order.orderDate || new Date().toISOString(),
                    customerId: 'FLIPKART_CUSTOMER', // Generic
                    customerName: 'Flipkart Customer',
                    items: [invoiceItem],
                    subTotal: order.saleAmount || 0,
                    tax: 0, // Simplified for now, or calculate based on GST
                    totalAmount: order.saleAmount || 0,
                    channel: 'FLIPKART',
                    channelOrderId: order.orderItemId,
                    invoiceType: 'SALES',
                    status: 'Paid' // Assume paid/settled logic handled elsewhere or later
                } as any; // Using any to bypass optional constraint mismatch if strict

                await addInvoice(newInvoice);

                // Update Product Quantity
                const newQty = currentQty - qtyToDeduct;
                await updateProduct(product.id, { quantity: newQty });
                productQtyMap.set(product.id, newQty);

                addedCount++;
            } catch (err) {
                console.error("Error syncing Flipkart order:", order.orderItemId, err);
                errorCount++;
            }
        }

        // --- Process Meesho Orders ---
        for (const order of meeshoToSync) {
            currentCount++;
            setProgress(prev => ({ ...prev, current: currentCount }));

            try {
                const product = products.find(p => p.sku === order.supplierSku);

                if (!product) {
                    skippedCount++;
                    continue;
                }

                const currentQty = productQtyMap.get(product.id) ?? 0;
                const qtyToDeduct = order.quantity || 1;

                const invoiceItem: InvoiceItem = {
                    productId: product.id,
                    productName: product.title,
                    quantity: qtyToDeduct,
                    mrp: product.mrp,
                    price: (order.totalSaleAmount || 0) / qtyToDeduct,
                    discount: 0,
                    tax: product.gstRate,
                    total: order.totalSaleAmount || 0
                };

                const newInvoice: Omit<Invoice, 'id'> = {
                    date: order.orderDate || new Date().toISOString(),
                    customerId: 'MEESHO_CUSTOMER',
                    customerName: 'Meesho Customer',
                    items: [invoiceItem],
                    subTotal: order.totalSaleAmount || 0,
                    tax: 0,
                    totalAmount: order.totalSaleAmount || 0,
                    channel: 'MEESHO',
                    channelOrderId: order.subOrderNo,
                    invoiceType: 'SALES',
                    status: 'Paid'
                } as any;

                await addInvoice(newInvoice);

                // Update Product Quantity
                const newQty = currentQty - qtyToDeduct;
                await updateProduct(product.id, { quantity: newQty });
                productQtyMap.set(product.id, newQty);

                addedCount++;
            } catch (err) {
                console.error("Error syncing Meesho order:", order.subOrderNo, err);
                errorCount++;
            }
        }

        setProgress(prev => ({ ...prev, added: addedCount, skipped: skippedCount, errors: errorCount }));
        setFinalMessage(`Sync Completed! Added: ${addedCount}, Skipped (SKU mismatch/Duplicate): ${skippedCount + (invoices.length - existingOrderIds.size)}, Errors: ${errorCount}`);
        setSyncing(false);
        if (onSuccess && addedCount > 0) onSuccess();
    };

    if (!isOpen) return null;

    return (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content shadow-lg border-0">
                    <div className="modal-header border-bottom-0 pb-0">
                        <h5 className="modal-title fw-bold">Sync Reports to Invoices</h5>
                        <button type="button" className="btn-close" onClick={!syncing ? onClose : undefined} disabled={syncing}></button>
                    </div>
                    <div className="modal-body text-center py-4">
                        {!syncing && !finalMessage && (
                            <div className="d-flex flex-column align-items-center gap-3">
                                <div className="bg-primary bg-opacity-10 p-4 rounded-circle mb-2">
                                    <RefreshCcw size={48} className="text-primary" />
                                </div>
                                <h6 className="mb-1 fw-bold">Ready to Sync</h6>
                                <p className="text-secondary small mb-3">
                                    This will create Invoice records for all Flipkart and Meesho orders that haven't been synced yet.
                                    Matching is done via <strong>Product SKU</strong>.
                                </p>
                                <div className="d-flex gap-2">
                                    <button className="btn btn-outline-secondary px-4" onClick={onClose}>Cancel</button>
                                    <button className="btn btn-primary px-4" onClick={handleSync}>Start Sync</button>
                                </div>
                            </div>
                        )}

                        {syncing && (
                            <div className="d-flex flex-column align-items-center gap-3">
                                <Loader size={40} className="text-primary animate-spin" />
                                <h6 className="fw-bold">Syncing Orders...</h6>
                                <div className="w-100 px-4">
                                    <div className="progress" style={{ height: '8px' }}>
                                        <div
                                            className="progress-bar bg-primary"
                                            role="progressbar"
                                            style={{ width: `${(progress.current / (progress.total || 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                    <div className="d-flex justify-content-between small text-muted mt-2">
                                        <span>Items: {progress.current} / {progress.total}</span>
                                        <span>Added: {progress.added}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {finalMessage && (
                            <div className="d-flex flex-column align-items-center gap-3">
                                <CheckCircle size={48} className="text-success" />
                                <h6 className="fw-bold">Sync Complete</h6>
                                <p className="text-secondary small mb-3">{finalMessage}</p>
                                <button className="btn btn-success px-4" onClick={onClose}>Done</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SyncReportsModal;
