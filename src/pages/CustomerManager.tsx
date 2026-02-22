import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Loader, User } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import type { Customer } from '../types';
import CustomerModal from '../components/CustomerModal';

const CustomerManager: React.FC = () => {
    const { data: customers, loading, add, update, remove } = useFirestore<Customer>('customers');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    const filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this customer?')) {
            await remove(id);
        }
    };

    const handleSave = async (customer: Customer) => {
        try {
            if (editingCustomer && customer.id) {
                const { id, ...data } = customer;
                await update(id, data);
            } else {
                const { id, ...data } = customer;
                await add(data);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving customer:", error);
            alert("Failed to save customer.");
        }
    };

    if (loading) {
        return <div className="d-flex justify-content-center align-items-center h-100"><Loader className="animate-spin" /></div>;
    }

    return (
        <div className="container-fluid p-0">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
                <h1 className="h3 mb-0 text-dark">Customer Directory</h1>
                <button
                    onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }}
                    className="btn btn-primary d-flex align-items-center gap-2"
                >
                    <Plus size={20} />
                    Add Customer
                </button>
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-body">
                    <div className="input-group mb-4" style={{ maxWidth: '400px' }}>
                        <span className="input-group-text bg-white border-end-0">
                            <Search className="text-muted" size={20} />
                        </span>
                        <input
                            type="text"
                            placeholder="Search by name, phone, or email..."
                            className="form-control border-start-0 ps-0"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th className="py-3">Customer</th>
                                    <th className="py-3">Contact</th>
                                    <th className="py-3">GST</th>
                                    <th className="py-3">Address</th>
                                    <th className="py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-5 text-muted">
                                            No customers found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCustomers.map((customer) => (
                                        <tr key={customer.id}>
                                            <td>
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="bg-primary-subtle rounded-circle d-flex align-items-center justify-content-center text-primary" style={{ width: '40px', height: '40px' }}>
                                                        <User size={20} />
                                                    </div>
                                                    <div>
                                                        <span className="d-block fw-medium">{customer.name}</span>
                                                        <span className="small text-muted">{customer.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="small font-monospace">{customer.phone}</div>
                                            </td>
                                            <td>
                                                <span className="badge bg-light text-dark font-monospace text-uppercase">
                                                    {customer.gst || 'N/A'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="text-truncate small" style={{ maxWidth: '200px' }} title={customer.address}>
                                                    {customer.address}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="d-flex gap-2">
                                                    <button
                                                        onClick={() => { setEditingCustomer(customer); setIsModalOpen(true); }}
                                                        className="btn btn-sm btn-outline-secondary border-0"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(customer.id)}
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

            <CustomerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                customer={editingCustomer}
            />
        </div>
    );
};

export default CustomerManager;
