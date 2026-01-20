import React, { useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import type { CartItem } from '../types';

interface InvoicePreviewModalProps {
    show: boolean;
    onClose: () => void;
    data: {
        invoiceId?: string;
        date: string;
        customerName: string;
        customerPhone?: string;
        items: CartItem[];
        subTotal: number;
        tax: number;
        deliveryCharges?: number;
        logisticsFee?: number;
        marketplaceFee?: number;
        otherTax?: number;
        refundAmount?: number;
        total: number;
        type: 'SALES' | 'PURCHASE';
        channel?: string;
        channelOrderId?: string;
    };
}

const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({ show, onClose, data }) => {
    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
    } as any);

    if (!show) return null;

    return (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="bg-white rounded shadow-lg d-flex flex-column" style={{ width: '800px', maxHeight: '90vh' }}>
                <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Print Preview</h5>
                    <div className="d-flex gap-2">
                        <button onClick={handlePrint} className="btn btn-primary btn-sm d-flex align-items-center gap-2">
                            <Printer size={16} /> Print
                        </button>
                        <button onClick={onClose} className="btn btn-outline-secondary btn-sm p-1">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="overflow-auto p-4 flex-fill bg-light">
                    <div ref={componentRef} className="bg-white p-5 mx-auto shadow-sm" style={{ maxWidth: '210mm', minHeight: '297mm' }}>
                        {/* Header */}
                        <div className="text-center mb-5">
                            <h2 className="fw-bold text-uppercase mb-2">{data.type === 'SALES' ? 'Tax Invoice' : 'Purchase Bill'}</h2>
                            <p className="text-muted mb-0">Original Copy</p>
                        </div>

                        {/* Company & Customer Details */}
                        <div className="row mb-5">
                            <div className="col-6">
                                <h6 className="fw-bold text-uppercase text-muted small mb-2">Billed By</h6>
                                <h5 className="fw-bold mb-1">My Company Name</h5>
                                <p className="mb-0 small text-muted">123 Business Street, Tech City</p>
                                <p className="mb-0 small text-muted">Phone: +91 98765 43210</p>
                                <p className="small text-muted">GSTIN: 29ABCDE1234F1Z5</p>
                            </div>
                            <div className="col-6 text-end">
                                <h6 className="fw-bold text-uppercase text-muted small mb-2">Billed To</h6>
                                <h5 className="fw-bold mb-1">{data.customerName}</h5>
                                {data.customerPhone && <p className="mb-0 small text-muted">Phone: {data.customerPhone}</p>}
                                <div className="mt-3">
                                    <p className="mb-0 small fw-bold">Invoice No: <span className="text-dark">{data.invoiceId || 'DRAFT'}</span></p>
                                    <p className="mb-0 small">Date: {new Date(data.date).toLocaleDateString()}</p>
                                    {data.channel && data.channel !== 'OFFLINE' && (
                                        <div className="mt-2 border-top pt-1">
                                            <p className="mb-0 small text-muted">Channel: {data.channel}</p>
                                            {data.channelOrderId && <p className="mb-0 small text-muted">Ref: {data.channelOrderId}</p>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="table-responsive mb-4">
                            <table className="table table-bordered border-dark mb-0 text-center" style={{ fontSize: '0.9rem' }}>
                                <thead className="table-light">
                                    <tr>
                                        <th className="text-start" style={{ width: '40%' }}>Item Description</th>
                                        <th>MRP</th>
                                        <th>Qty</th>
                                        <th>Rate</th>
                                        <th>Disc%</th>
                                        <th>Tax%</th>
                                        <th className="text-end">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item, index) => {
                                        const salePrice = Number(data.type === 'SALES' ? item.salePrice : item.purchasePrice);
                                        const discount = Number(item.discount) || 0;
                                        const gstRate = Number(item.gstRate) || 0;
                                        const mrp = Number(item.mrp) || 0;

                                        const priceAfterDiscount = salePrice * (1 - discount / 100);
                                        const totalBeforeTax = priceAfterDiscount * item.quantity;
                                        const taxAmount = totalBeforeTax * (gstRate / 100);
                                        const itemTotal = totalBeforeTax + taxAmount;

                                        return (
                                            <tr key={index}>
                                                <td className="text-start">
                                                    <span className="fw-medium">{item.title}</span>
                                                    <br />
                                                    <span className="text-muted small" style={{ fontSize: '0.75rem' }}>SKU: {item.sku}</span>
                                                </td>
                                                <td>{mrp.toFixed(2)}</td>
                                                <td>{item.quantity}</td>
                                                <td>{salePrice.toFixed(2)}</td>
                                                <td>{discount}%</td>
                                                <td>{gstRate}%</td>
                                                <td className="text-end">{itemTotal.toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="row justify-content-end">
                            <div className="col-5">
                                <table className="table table-sm table-borderless mb-0">
                                    <tbody>
                                        <tr>
                                            <td className="text-end text-muted">Subtotal:</td>
                                            <td className="text-end fw-medium">₹{data.subTotal.toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td className="text-end text-muted">Tax (GST):</td>
                                            <td className="text-end fw-medium">₹{data.tax.toFixed(2)}</td>
                                        </tr>
                                        {data.deliveryCharges ? (
                                            <tr>
                                                <td className="text-end text-muted">Delivery Charges:</td>
                                                <td className="text-end fw-medium">₹{data.deliveryCharges.toFixed(2)}</td>
                                            </tr>
                                        ) : null}
                                        <tr className="border-top border-dark">
                                            <td className="text-end fw-bold pt-2">Grand Total:</td>
                                            <td className="text-end fw-bold h5 mb-0 pt-2">₹{data.total.toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-5 pt-5 text-center text-muted small">
                            <p className="mb-1">Thank you for your business!</p>
                            <p>Terms & Conditions Apply</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicePreviewModal;
