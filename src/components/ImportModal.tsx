import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useFirestore } from '../hooks/useFirestore';
import type { Product } from '../types';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { add, data: existingProducts } = useFirestore<Product>('products');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({ total: 0, new: 0, duplicates: 0 });

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
            parseFile(selectedFile);
        }
    };

    const parseFile = async (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                processPreview(jsonData);
            } catch (err) {
                console.error("Error parsing file:", err);
                setError("Failed to parse file. Please ensure it's a valid Excel or CSV.");
            }
        };
        reader.readAsBinaryString(file);
    };

    const processPreview = (data: any[]) => {
        // Map columns to our schema
        // Expected Flipkart/General Columns: Seller SKU, Product Title, Selling Price, MRP, Stock, GST, HSN

        const mappedProducts: Partial<Product>[] = data.map(row => {
            // Try to find matching keys (case insensitive loose match)
            const getVal = (keys: string[]) => {
                const foundKey = Object.keys(row).find(k => keys.some(key => k.toLowerCase().includes(key.toLowerCase())));
                return foundKey ? row[foundKey] : null;
            };

            return {
                sku: getVal(['Seller SKU', 'SKU']) || '',
                title: getVal(['Product Title', 'Title', 'Name']) || '',
                category: 'Imported', // Default
                mrp: Number(getVal(['MRP', 'Maximum Retail Price'])) || 0,
                salePrice: Number(getVal(['Selling Price', 'Sale Price', 'Price'])) || 0,
                purchasePrice: 0, // Not usually in seller report
                quantity: Number(getVal(['Stock', 'Quantity'])) || 0,
                hsnCode: getVal(['HSN', 'HSN Code'])?.toString() || '',
                gstRate: Number(getVal(['GST', 'Tax'])) || 0,
                status: 'active' as const
            };
        }).filter(p => p.sku && p.title); // Basic validation

        setPreviewData(mappedProducts);

        // Stats
        const existingSkus = new Set(existingProducts.map(p => p.sku?.toLowerCase()));
        const duplicates = mappedProducts.filter(p => existingSkus.has(p.sku?.toLowerCase() || '')).length;

        setStats({
            total: mappedProducts.length,
            new: mappedProducts.length - duplicates,
            duplicates: duplicates
        });
    };

    const handleImport = async () => {
        if (previewData.length === 0) return;

        setUploading(true);
        try {
            const existingSkus = new Set(existingProducts.map(p => p.sku?.toLowerCase()));
            let addedCount = 0;

            for (const product of previewData) {
                if (!existingSkus.has(product.sku?.toLowerCase() || '')) {
                    // Add new product
                    // Note: useFirestore 'add' generates ID.
                    await add({
                        ...product,
                        image: '', // Placeholder
                        purchasePrice: product.purchasePrice || (product.salePrice * 0.7) // Rough estimate if missing
                    } as Product);
                    addedCount++;
                }
            }

            alert(`Successfully imported ${addedCount} products!`);
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            setError("Error importing products. Check console.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
            <div className="bg-white rounded shadow-lg d-flex flex-column" style={{ width: '600px', maxHeight: '90vh' }}>
                <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
                        <FileSpreadsheet size={20} className="text-success" />
                        Import Products
                    </h5>
                    <button onClick={onClose} className="btn-close" disabled={uploading}></button>
                </div>

                <div className="p-4 flex-fill overflow-auto">
                    {!file ? (
                        <div
                            className="border-2 border-dashed rounded p-5 text-center cursor-pointer hover-bg-light transition"
                            onClick={() => fileInputRef.current?.click()}
                            style={{ borderColor: '#ddd' }}
                        >
                            <Upload size={48} className="text-muted mb-3" />
                            <h6 className="fw-bold text-dark">Click to Upload Excel/CSV</h6>
                            <p className="text-muted small mb-0">Supports .xlsx, .xls, .csv</p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="d-none"
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileChange}
                            />
                        </div>
                    ) : (
                        <div>
                            <div className="d-flex align-items-center justify-content-between mb-4 bg-light p-3 rounded">
                                <div className="d-flex align-items-center gap-3">
                                    <FileSpreadsheet size={24} className="text-success" />
                                    <div>
                                        <p className="mb-0 fw-medium text-dark">{file.name}</p>
                                        <p className="mb-0 small text-muted">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <button onClick={() => { setFile(null); setPreviewData([]); }} className="btn btn-sm btn-outline-danger" disabled={uploading}>
                                    Change
                                </button>
                            </div>

                            {error && (
                                <div className="alert alert-danger d-flex align-items-center gap-2 small">
                                    <AlertCircle size={16} /> {error}
                                </div>
                            )}

                            {previewData.length > 0 && (
                                <div className="row g-2 mb-3">
                                    <div className="col-4">
                                        <div className="p-2 border rounded text-center bg-light">
                                            <p className="mb-0 small text-muted">Found</p>
                                            <p className="mb-0 fw-bold fs-5">{stats.total}</p>
                                        </div>
                                    </div>
                                    <div className="col-4">
                                        <div className="p-2 border rounded text-center bg-success bg-opacity-10">
                                            <p className="mb-0 small text-success fw-bold">New</p>
                                            <p className="mb-0 fw-bold fs-5 text-success">{stats.new}</p>
                                        </div>
                                    </div>
                                    <div className="col-4">
                                        <div className="p-2 border rounded text-center bg-warning bg-opacity-10">
                                            <p className="mb-0 small text-warning fw-bold">Duplicates</p>
                                            <p className="mb-0 fw-bold fs-5 text-warning">{stats.duplicates}</p>
                                        </div>
                                    </div>
                                    <div className="col-12 text-center mt-2">
                                        <small className="text-muted fst-italic">Duplicates (by SKU) will be skipped.</small>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-3 border-top d-flex justify-content-end gap-2">
                    <button onClick={onClose} className="btn btn-light" disabled={uploading}>Cancel</button>
                    <button
                        onClick={handleImport}
                        className="btn btn-primary d-flex align-items-center gap-2"
                        disabled={!file || previewData.length === 0 || uploading}
                    >
                        {uploading ? <Loader size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                        Import {stats.new} Products
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportModal;
