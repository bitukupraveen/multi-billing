import React, { useState } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import type { ExpenseBill } from '../types';
import { Search, Loader, Calendar, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ExpenseBillsList: React.FC = () => {
    const { data: bills, loading, remove } = useFirestore<ExpenseBill>('expense_bills');
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredBills = bills.filter(bill =>
        bill.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.id?.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this expense record?')) {
            await remove(id);
        }
    };

    if (loading) {
        return <div className="d-flex justify-content-center align-items-center h-100"><Loader className="animate-spin" /></div>;
    }

    return (
        <div className="container-fluid p-0">
            <h1 className="h3 mb-4 text-dark">Expense History</h1>

            <div className="card shadow-sm border-0">
                <div className="card-header bg-white py-3">
                    <div className="input-group" style={{ maxWidth: '300px' }}>
                        <span className="input-group-text bg-light border-end-0">
                            <Search className="text-secondary" size={18} />
                        </span>
                        <input
                            type="text"
                            className="form-control border-start-0 bg-light"
                            placeholder="Search payee or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th className="ps-4">Date</th>
                                    <th>Ref ID</th>
                                    <th>Payee / Vendor</th>
                                    <th>Items</th>
                                    <th>Method</th>
                                    <th className="text-end">Amount</th>
                                    <th className="text-end pe-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBills.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-5 text-muted">
                                            No expense records found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBills.map(bill => (
                                        <tr key={bill.id}>
                                            <td className="ps-4 text-nowrap">
                                                <div className="d-flex align-items-center gap-2 text-muted">
                                                    <Calendar size={14} />
                                                    {new Date(bill.date).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="font-monospace small text-primary">{bill.id}</td>
                                            <td className="fw-medium">{bill.vendorName}</td>
                                            <td>
                                                <span className="small text-muted">
                                                    {bill.items.length} items
                                                    <span className="mx-1">•</span>
                                                    {bill.items.map(i => i.expenseItemName).slice(0, 2).join(', ')}
                                                    {bill.items.length > 2 && '...'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="badge bg-light text-dark border">
                                                    {bill.paymentMethod || 'Cash'}
                                                </span>
                                            </td>
                                            <td className="text-end fw-bold text-danger">
                                                -₹{bill.totalAmount.toFixed(2)}
                                            </td>
                                            <td className="text-end pe-4">
                                                <div className="d-flex justify-content-end gap-2">
                                                    <button
                                                        onClick={() => navigate(`/expenses/billing?id=${bill.id}`)}
                                                        className="btn btn-sm btn-outline-secondary border-0"
                                                        title="View/Edit"
                                                    >
                                                        <Eye size={18} />
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

export default ExpenseBillsList;
