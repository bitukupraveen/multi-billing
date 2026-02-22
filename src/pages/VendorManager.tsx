import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Loader, Truck } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import type { Vendor } from '../types';
import VendorModal from '../components/VendorModal';

const VendorManager: React.FC = () => {
    const { data: vendors, loading, add, update, remove } = useFirestore<Vendor>('vendors');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

    const filteredVendors = vendors.filter(v =>
        v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.phone?.includes(searchTerm) ||
        v.gst?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this vendor?')) {
            await remove(id);
        }
    };

    const handleSave = async (vendor: Vendor) => {
        try {
            if (editingVendor && vendor.id) {
                const { id, ...data } = vendor;
                await update(id, data);
            } else {
                const { id, ...data } = vendor;
                await add(data);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving vendor:", error);
            alert("Failed to save vendor.");
        }
    };

    if (loading) {
        return <div className="d-flex justify-content-center align-items-center h-100"><Loader className="animate-spin" /></div>;
    }

    return (
        <div className="container-fluid p-0">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
                <h1 className="h3 mb-0 text-dark">Vendor Directory</h1>
                <button
                    onClick={() => { setEditingVendor(null); setIsModalOpen(true); }}
                    className="btn btn-primary d-flex align-items-center gap-2"
                >
                    <Plus size={20} />
                    Add Vendor
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
                            placeholder="Search by name, phone, or GST..."
                            className="form-control border-start-0 ps-0"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th className="py-3">Vendor</th>
                                    <th className="py-3">Contact</th>
                                    <th className="py-3">GST</th>
                                    <th className="py-3">Address</th>
                                    <th className="py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVendors.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-5 text-muted">
                                            No vendors found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredVendors.map((vendor) => (
                                        <tr key={vendor.id}>
                                            <td>
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="bg-success-subtle rounded-circle d-flex align-items-center justify-content-center text-success" style={{ width: '40px', height: '40px' }}>
                                                        <Truck size={20} />
                                                    </div>
                                                    <div>
                                                        <span className="d-block fw-medium">{vendor.name}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="small font-monospace">{vendor.phone}</div>
                                            </td>
                                            <td>
                                                <span className="badge bg-light text-dark font-monospace text-uppercase">
                                                    {vendor.gst || 'N/A'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="text-truncate small" style={{ maxWidth: '200px' }} title={vendor.address}>
                                                    {vendor.address}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="d-flex gap-2">
                                                    <button
                                                        onClick={() => { setEditingVendor(vendor); setIsModalOpen(true); }}
                                                        className="btn btn-sm btn-outline-secondary border-0"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(vendor.id)}
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

            <VendorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                vendor={editingVendor}
            />
        </div>
    );
};

export default VendorManager;
