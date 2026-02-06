import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Trash2, Save, Calculator, RefreshCw } from 'lucide-react';

interface PricingItem {
    id?: string;
    productName: string;
    sellingPrice: number;
    gstPercent: number;
    costOfGoods: number;
    profit: number;
    margin: number;
}

const ProductPricing: React.FC = () => {
    const [productName, setProductName] = useState('');
    const [sellingPrice, setSellingPrice] = useState<number | ''>('');
    const [gstPercent, setGstPercent] = useState<number | ''>(18);
    const [costOfGoods, setCostOfGoods] = useState<number | ''>('');

    // Calculated values
    const [profit, setProfit] = useState<number>(0);
    const [margin, setMargin] = useState<number>(0);
    const [gstAmount, setGstAmount] = useState<number>(0);
    const [basePrice, setBasePrice] = useState<number>(0);

    const [savedCalculations, setSavedCalculations] = useState<PricingItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Calculate whenever inputs change
    useEffect(() => {
        calculate();
    }, [sellingPrice, gstPercent, costOfGoods]);

    const calculate = () => {
        const sp = Number(sellingPrice) || 0;
        const gst = Number(gstPercent) || 0;
        const cog = Number(costOfGoods) || 0;

        // Logic: 
        // Selling Price is inclusive of GST (Standard for India Ecommerce Listings)
        // Base Price = SP / (1 + GST/100)
        // GST Amount = SP - Base Price
        // Profit = Base Price - COG
        // Margin % = (Profit / SP) * 100 

        const base = sp / (1 + (gst / 100));
        const gstAmt = sp - base;
        const prof = base - cog;
        const marg = sp > 0 ? (prof / sp) * 100 : 0;

        setBasePrice(base);
        setGstAmount(gstAmt);
        setProfit(prof);
        setMargin(marg);
    };

    const fetchCalculations = async () => {
        try {
            setLoading(true);
            const q = query(collection(db, 'pricing_calculations'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const items: PricingItem[] = [];
            querySnapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() } as PricingItem);
            });
            setSavedCalculations(items);
        } catch (error) {
            console.error("Error fetching calculations: ", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCalculations();
    }, []);

    const handleSave = async () => {
        if (!productName || !sellingPrice || !costOfGoods) {
            alert("Please fill in Product Name, Selling Price and Cost of Goods");
            return;
        }

        try {
            setSaving(true);
            await addDoc(collection(db, 'pricing_calculations'), {
                productName,
                sellingPrice: Number(sellingPrice),
                gstPercent: Number(gstPercent),
                costOfGoods: Number(costOfGoods),
                profit,
                margin,
                createdAt: new Date()
            });
            setProductName('');
            // Optional: reset others or keep them for next calculation
            alert("Calculation saved successfully!");
            fetchCalculations();
        } catch (error) {
            console.error("Error saving document: ", error);
            alert("Error saving calculation");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this calculation?')) {
            try {
                await deleteDoc(doc(db, 'pricing_calculations', id));
                fetchCalculations();
            } catch (error) {
                console.error("Error deleting document: ", error);
            }
        }
    };

    return (
        <div className="container-fluid py-4">
            <h2 className="mb-4 d-flex align-items-center gap-2">
                <Calculator className="text-primary" />
                Product Pricing Calculator
            </h2>

            <div className="row">
                <div className="col-lg-5 mb-4">
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-white py-3">
                            <h5 className="mb-0 text-primary fw-bold">New Calculation</h5>
                        </div>
                        <div className="card-body">
                            <div className="mb-3">
                                <label className="form-label text-secondary small fw-bold">Product Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Enter product name"
                                    value={productName}
                                    onChange={(e) => setProductName(e.target.value)}
                                />
                            </div>

                            <div className="row g-3 mb-3">
                                <div className="col-md-6">
                                    <label className="form-label text-secondary small fw-bold">Selling Price (₹)</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="0.00"
                                        value={sellingPrice}
                                        onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                    />
                                    <div className="form-text small">Inclusive of GST</div>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-secondary small fw-bold">GST %</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="18"
                                        value={gstPercent}
                                        onChange={(e) => setGstPercent(e.target.value === '' ? '' : Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label text-secondary small fw-bold">Cost of Goods (₹)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    placeholder="0.00"
                                    value={costOfGoods}
                                    onChange={(e) => setCostOfGoods(e.target.value === '' ? '' : Number(e.target.value))}
                                />
                            </div>

                            <hr className="my-4" />

                            <div className="row g-3 mb-3">
                                <div className="col-6">
                                    <div className="p-3 bg-light rounded-3 border">
                                        <div className="text-secondary small fw-bold mb-1">Base Price</div>
                                        <div className="h5 mb-0">₹{basePrice.toFixed(2)}</div>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="p-3 bg-light rounded-3 border">
                                        <div className="text-secondary small fw-bold mb-1">GST Amount</div>
                                        <div className="h5 mb-0">₹{gstAmount.toFixed(2)}</div>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className={`p-3 rounded-3 border ${profit >= 0 ? 'bg-success-subtle border-success' : 'bg-danger-subtle border-danger'}`}>
                                        <div className={`small fw-bold mb-1 ${profit >= 0 ? 'text-success' : 'text-danger'}`}>Profit</div>
                                        <div className={`h5 mb-0 ${profit >= 0 ? 'text-success' : 'text-danger'}`}>₹{profit.toFixed(2)}</div>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className={`p-3 rounded-3 border ${margin >= 0 ? 'bg-success-subtle border-success' : 'bg-danger-subtle border-danger'}`}>
                                        <div className={`small fw-bold mb-1 ${margin >= 0 ? 'text-success' : 'text-danger'}`}>Margin</div>
                                        <div className={`h5 mb-0 ${margin >= 0 ? 'text-success' : 'text-danger'}`}>{margin.toFixed(2)}%</div>
                                    </div>
                                </div>
                            </div>

                            <button
                                className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2 py-2"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                <Save size={18} />
                                {saving ? 'Saving...' : 'Save Calculation'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="col-lg-7">
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-white py-3 d-flex align-items-center justify-content-between">
                            <h5 className="mb-0 text-primary fw-bold">Saved Calculations</h5>
                            <button
                                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                                onClick={fetchCalculations}
                            >
                                <RefreshCw size={14} /> Refresh
                            </button>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="ps-4">Product Name</th>
                                            <th className="text-end">Selling Price</th>
                                            <th className="text-end">Cost</th>
                                            <th className="text-end">Profit</th>
                                            <th className="text-end">Margin</th>
                                            <th className="text-end pe-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-5 text-secondary">Loading...</td>
                                            </tr>
                                        ) : savedCalculations.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-5 text-secondary">
                                                    No saved calculations yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            savedCalculations.map((item) => (
                                                <tr key={item.id}>
                                                    <td className="ps-4 fw-medium">{item.productName}</td>
                                                    <td className="text-end">₹{item.sellingPrice.toFixed(2)}</td>
                                                    <td className="text-end">₹{item.costOfGoods.toFixed(2)}</td>
                                                    <td className={`text-end fw-bold ${item.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                                                        ₹{item.profit.toFixed(2)}
                                                    </td>
                                                    <td className={`text-end fw-bold ${item.margin >= 0 ? 'text-success' : 'text-danger'}`}>
                                                        {item.margin.toFixed(2)}%
                                                    </td>
                                                    <td className="text-end pe-4">
                                                        <button
                                                            className="btn btn-sm btn-outline-danger border-0"
                                                            onClick={() => item.id && handleDelete(item.id)}
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
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
    );
};

export default ProductPricing;
