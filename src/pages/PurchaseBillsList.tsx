import React, { useState } from 'react';
import { Edit, Trash2, Search, Loader } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import type { PurchaseBill } from '../types';
import { useNavigate } from 'react-router-dom';

const PurchaseBillsList: React.FC = () => {
    const { data: bills, loading, remove: deleteBill } = useFirestore<PurchaseBill>('purchase_bills');
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const filteredBills = bills.filter(bill =>
        bill.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this bill?')) {
            await deleteBill(id);
        }
    };

    const handleEdit = (id: string) => {
        navigate(`/purchase-billing?id=${id}`);
    };

    if (loading) {
        return <div className="d-flex justify-content-center align-items-center h-100"><Loader className="animate-spin" /></div>;
    }

    return (
        <div className="container-fluid p-0">
            <h1 className="h3 mb-4 text-dark">Purchase Bills History</h1>

            <div className="card shadow-sm border-0">
                <div className="card-body">
                    <div className="input-group mb-4" style={{ maxWidth: '400px' }}>
                        <span className="input-group-text bg-white border-end-0">
                            <Search className="text-muted" size={20} />
                        </span>
                        <input
                            type="text"
                            placeholder="Search bills..."
                            className="form-control border-start-0 ps-0"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th className="py-3">Bill ID</th>
                                    <th className="py-3">Date</th>
                                    <th className="py-3">Vendor</th>
                                    <th className="py-3">Items</th>
                                    <th className="py-3">Total</th>
                                    <th className="py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBills.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-5 text-muted">
                                            No purchase bills found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBills.map((bill) => (
                                        <tr key={bill.id}>
                                            <td className="text-muted font-monospace small">#{bill.id}</td>
                                            <td>{new Date(bill.date).toLocaleDateString()}</td>
                                            <td className="fw-medium">{bill.vendorName}</td>
                                            <td>{bill.items.length} items</td>
                                            <td className="fw-bold text-success">₹{bill.totalAmount.toFixed(2)}</td>
                                            <td>
                                                <div className="d-flex gap-2">
                                                    <button
                                                        onClick={() => handleEdit(bill.id)}
                                                        className="btn btn-sm btn-outline-primary border-0"
                                                        title="Edit"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(bill.id)}
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
        </div>
    );
};

export default PurchaseBillsList;
