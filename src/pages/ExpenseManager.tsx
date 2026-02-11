import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Loader, Tag } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import type { ExpenseItem } from '../types';
import ExpenseItemModal from '../components/ExpenseItemModal';

const ExpenseManager: React.FC = () => {
    const { data: items, loading, add, update, remove } = useFirestore<ExpenseItem>('expense_items');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState<ExpenseItem | null>(null);

    const filteredItems = items.filter(item =>
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this expense item?')) {
            await remove(id);
        }
    };

    const handleSave = async (item: ExpenseItem) => {
        try {
            if (editingItem && item.id) {
                const { id, ...data } = item;
                await update(id, data);
            } else {
                const { id, ...data } = item;
                await add(data); // ID auto-generated
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving expense item:", error);
            alert("Failed to save expense item. Check console.");
        }
    };

    if (loading) {
        return <div className="d-flex justify-content-center align-items-center h-100"><Loader className="animate-spin" /></div>;
    }

    return (
        <div className="container-fluid p-0">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
                <h1 className="h3 mb-0 text-dark">Expense Items</h1>
                <div className="d-flex gap-2">
                    <button
                        onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
                        className="btn btn-primary d-flex align-items-center gap-2"
                    >
                        <Plus size={20} />
                        Add Expense Item
                    </button>
                </div>
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-body">
                    <div className="input-group mb-4" style={{ maxWidth: '400px' }}>
                        <span className="input-group-text bg-white border-end-0">
                            <Search className="text-muted" size={20} />
                        </span>
                        <input
                            type="text"
                            placeholder="Search expenses..."
                            className="form-control border-start-0 ps-0"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th className="py-3">Title</th>
                                    <th className="py-3">Category</th>
                                    <th className="py-3">HSN Code</th>
                                    <th className="py-3">Default Cost</th>
                                    <th className="py-3">Status</th>
                                    <th className="py-3 text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-5 text-muted">
                                            No expense items found. Add your first one!
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                                                        <Tag size={20} className="text-secondary" />
                                                    </div>
                                                    <div>
                                                        <span className="d-block fw-medium">{item.title}</span>
                                                        {item.description && <span className="small text-muted d-block text-truncate" style={{ maxWidth: '200px' }}>{item.description}</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-10 rounded-pill fw-normal px-3">
                                                    {item.category || 'Uncategorized'}
                                                </span>
                                            </td>
                                            <td className="font-monospace text-muted small">
                                                {item.hsnCode || '-'}
                                            </td>
                                            <td className="fw-medium">
                                                {item.defaultPrice ? `₹${item.defaultPrice.toFixed(2)}` : '-'}
                                            </td>
                                            <td>
                                                <span className={`badge rounded-pill ${item.status === 'inactive' ? 'bg-secondary' : 'bg-success'} bg-opacity-10 text-${item.status === 'inactive' ? 'secondary' : 'success'}`}>
                                                    {(item.status || 'active').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="text-end">
                                                <div className="d-flex gap-2 justify-content-end">
                                                    <button
                                                        onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                                                        className="btn btn-sm btn-outline-secondary border-0"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
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

            <ExpenseItemModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                item={editingItem}
            />
        </div>
    );
};

export default ExpenseManager;
