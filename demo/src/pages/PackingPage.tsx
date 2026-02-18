import { useState } from 'react';
import { useDemo } from '../App';
import { completePackingRun } from '../store/demoStore';

export default function PackingPage() {
    const { data, setData, toast } = useDemo();
    const [batchId, setBatchId] = useState('');
    const [fgItemId, setFgItemId] = useState('');
    const [outputQty, setOutputQty] = useState(0);
    const [packMats, setPackMats] = useState([{ itemId: '', quantity: 0 }]);

    const completedBatches = data.batches.filter(b => b.status === 'COMPLETED');
    const fgItems = data.items.filter(i => i.type === 'FG');
    const packItems = data.items.filter(i => i.type === 'PACKING');

    const selectedBatch = data.batches.find(b => b.id === batchId);
    const selectedFg = data.items.find(i => i.id === fgItemId);
    const bulkNeeded = selectedFg && outputQty > 0 ? ((selectedFg.packWeight || 100) / 1000) * outputQty : 0;

    const handleSubmit = () => {
        if (!batchId) { toast('Select source batch', 'error'); return; }
        if (!fgItemId) { toast('Select FG item', 'error'); return; }
        if (outputQty <= 0) { toast('Enter output quantity', 'error'); return; }
        const validPm = packMats.filter(p => p.itemId && p.quantity > 0);
        try {
            setData(completePackingRun(data, batchId, fgItemId, outputQty, validPm));
            toast(`Packed ${outputQty} units of ${selectedFg?.name}`);
            setBatchId(''); setFgItemId(''); setOutputQty(0); setPackMats([{ itemId: '', quantity: 0 }]);
        } catch (e: any) { toast(e.message, 'error'); }
    };

    return (
        <div>
            <h1 className="page-title">📦 Packing</h1>
            <p className="page-subtitle">Convert bulk powder into retail packs. Consumes bulk stock and packing materials, creates finished goods.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div className="card">
                    <div className="card-title" style={{ marginBottom: 20 }}>New Packing Run</div>

                    <div className="form-group">
                        <label>Source Batch (Completed)</label>
                        <select value={batchId} onChange={e => setBatchId(e.target.value)}>
                            <option value="">Select batch...</option>
                            {completedBatches.map(b => {
                                const r = data.recipes.find(x => x.id === b.recipeId)!;
                                const bulkItem = data.items.find(i => i.id === r.outputItemId);
                                return <option key={b.id} value={b.id}>{b.id} — {bulkItem?.name} ({bulkItem?.currentStock} KG available)</option>;
                            })}
                        </select>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Finished Good Item</label>
                            <select value={fgItemId} onChange={e => setFgItemId(e.target.value)}>
                                <option value="">Select FG...</option>
                                {fgItems.map(fg => <option key={fg.id} value={fg.id}>{fg.name} ({fg.packWeight}g)</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Quantity to Pack (PCS)</label>
                            <input type="number" value={outputQty || ''} onChange={e => setOutputQty(+e.target.value)} placeholder="e.g. 1000" />
                        </div>
                    </div>

                    {selectedFg && outputQty > 0 && (
                        <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 16, fontSize: '0.82rem' }}>
                            <strong>Calculation Preview:</strong>
                            <div style={{ marginTop: 6, color: 'var(--text-secondary)' }}>
                                {outputQty} pcs × {selectedFg.packWeight}g = <strong className="text-bulk">{bulkNeeded.toFixed(2)} KG</strong> bulk powder needed
                            </div>
                        </div>
                    )}

                    <label>Packing Materials Used</label>
                    {packMats.map((pm, idx) => (
                        <div key={idx} className="flex gap-8 mb-16" style={{ alignItems: 'end' }}>
                            <div style={{ flex: 2 }}>
                                <select value={pm.itemId} onChange={e => { const n = [...packMats]; n[idx] = { ...n[idx], itemId: e.target.value }; setPackMats(n); }}>
                                    <option value="">Select material...</option>
                                    {packItems.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.currentStock.toLocaleString()})</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <input type="number" value={pm.quantity || ''} onChange={e => { const n = [...packMats]; n[idx] = { ...n[idx], quantity: +e.target.value }; setPackMats(n); }} placeholder="Qty" />
                            </div>
                            {packMats.length > 1 && <button className="btn btn-outline btn-sm" onClick={() => setPackMats(packMats.filter((_, i) => i !== idx))}>✕</button>}
                        </div>
                    ))}
                    <button className="add-line-btn" onClick={() => setPackMats([...packMats, { itemId: '', quantity: 0 }])}>+ Add Packing Material</button>

                    <div className="modal-actions" style={{ marginTop: 20 }}>
                        <button className="btn btn-success w-full" onClick={handleSubmit}>✓ Complete Packing Run</button>
                    </div>
                </div>

                <div className="card">
                    <div className="card-title" style={{ marginBottom: 20 }}>Packing History ({data.packingRuns.length})</div>
                    {!data.packingRuns.length ? (
                        <div className="empty-state"><div className="icon">📦</div><p>No packing runs yet. Complete a production batch first, then pack!</p></div>
                    ) : [...data.packingRuns].reverse().map(pr => {
                        const fg = data.items.find(i => i.id === pr.fgItemId);
                        const bulk = data.items.find(i => i.id === pr.bulkItemId);
                        return (
                            <div key={pr.id} className="card" style={{ background: 'var(--bg-elevated)', padding: 14, marginBottom: 10 }}>
                                <div className="flex justify-between items-center">
                                    <strong className="mono">{pr.id}</strong>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{pr.date}</span>
                                </div>
                                <div style={{ fontSize: '0.85rem', marginTop: 6 }}>
                                    <span className="text-fg">{fg?.name}</span> × <strong>{pr.outputQuantity.toLocaleString()}</strong> pcs
                                </div>
                                <div className="flex gap-16" style={{ marginTop: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    <span>Bulk Used: {pr.bulkConsumed} KG ({bulk?.name})</span>
                                    <span>FG Cost: <strong className="text-primary">₹{pr.fgCostPerUnit}/unit</strong></span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4 }}>Source: {pr.sourceBatchId}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
