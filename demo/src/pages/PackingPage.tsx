import { useState, useEffect } from 'react';
import { useDemo } from '../App';
import { completePackingRun } from '../store/demoStore';
import { Item } from '../types';

export default function PackingPage() {
    const { data, setData, toast } = useDemo();
    const [batchId, setBatchId] = useState('');
    const [fgItemId, setFgItemId] = useState('');
    const [outputQty, setOutputQty] = useState(0);
    const [packMats, setPackMats] = useState([{ itemId: '', quantity: 0 }]);
    const [formOpen, setFormOpen] = useState(true);

    const completedBatches = data.batches.filter(b => b.status === 'COMPLETED');
    const bulkItemsWithStock = data.items.filter(i => i.type === 'BULK' && i.currentStock > 0);
    const packItems = data.items.filter(i => i.type === 'PACKING');

    let selectedSourceItem: Item | undefined;
    if (batchId.startsWith('BATCH-')) {
        const batch = data.batches.find(b => b.id === batchId);
        if (batch) {
            const recipe = data.recipes.find(r => r.id === batch.recipeId);
            selectedSourceItem = data.items.find(i => i.id === recipe?.outputItemId);
        }
    } else if (batchId.startsWith('DIR-')) {
        selectedSourceItem = data.items.find(i => i.id === batchId.replace('DIR-', ''));
    }

    const fgItems = selectedSourceItem
        ? data.items.filter(i => i.type === 'FG' && i.sourceBulkItemId === selectedSourceItem?.id)
        : data.items.filter(i => i.type === 'FG');

    useEffect(() => {
        if (fgItemId && !fgItems.find(i => i.id === fgItemId)) {
            setFgItemId('');
        }
    }, [batchId, fgItems, fgItemId]);

    const selectedFg = data.items.find(i => i.id === fgItemId);
    const bulkNeeded = selectedFg && outputQty > 0 ? ((selectedFg.packWeight || 100) / 1000) * outputQty : 0;

    useEffect(() => {
        if (selectedFg?.packingMaterials && outputQty > 0) {
            const autoMats = selectedFg.packingMaterials.map(m => ({
                itemId: m.itemId,
                quantity: m.quantityPerUnit * outputQty
            }));
            setPackMats(autoMats);
        }
    }, [fgItemId, outputQty, selectedFg]);

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
            <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
                <div>
                    <h1 className="page-title">Packing</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>Convert bulk powder into retail packs. Consumes bulk stock and packing materials.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setFormOpen(!formOpen)}>
                    {formOpen ? 'Hide Form' : '+ New Packing Run'}
                </button>
            </div>

            {/* Collapsible Form */}
            {formOpen && (
                <div className="form-panel" style={{ marginBottom: 24 }}>
                    <div style={{ padding: 24 }}>
                        <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>New Packing Run</h3>

                        <div className="form-group">
                            <label>Source (Batch or Bulk Stock)</label>
                            <select value={batchId} onChange={e => setBatchId(e.target.value)}>
                                <option value="">Select source...</option>
                                <optgroup label="Production Batches (Completed)">
                                    {completedBatches.map(b => {
                                        const r = data.recipes.find(x => x.id === b.recipeId)!;
                                        const bulkItem = data.items.find(i => i.id === r.outputItemId);
                                        return <option key={b.id} value={b.id}>{b.id} — {bulkItem?.name} ({b.actualOutput} KG produced)</option>;
                                    })}
                                </optgroup>
                                <optgroup label="Direct Bulk Stock (Purchased)">
                                    {bulkItemsWithStock.map(i => (
                                        <option key={i.id} value={`DIR-${i.id}`}>{i.id} — {i.name} ({i.currentStock} KG available)</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Finished Good Item (SKU)</label>
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
                            <div className="preview-strip">
                                <strong>Requirements:</strong> {outputQty} pcs × {selectedFg.packWeight}g = <strong className="text-primary">{bulkNeeded.toFixed(2)} KG</strong> bulk powder needed
                            </div>
                        )}

                        <div style={{ marginTop: 16 }}>
                            <label>Packing Materials</label>
                            <div className="table-container" style={{ marginBottom: 8 }}>
                                <table>
                                    <thead>
                                        <tr><th>Material</th><th style={{ width: 120 }}>Quantity</th><th style={{ width: 40 }}></th></tr>
                                    </thead>
                                    <tbody>
                                        {packMats.map((pm, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    <select value={pm.itemId} onChange={e => { const n = [...packMats]; n[idx] = { ...n[idx], itemId: e.target.value }; setPackMats(n); }} style={{ margin: 0 }}>
                                                        <option value="">Select material...</option>
                                                        {packItems.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.currentStock.toLocaleString()})</option>)}
                                                    </select>
                                                </td>
                                                <td>
                                                    <input type="number" value={pm.quantity || ''} onChange={e => { const n = [...packMats]; n[idx] = { ...n[idx], quantity: +e.target.value }; setPackMats(n); }} placeholder="Qty" style={{ margin: 0 }} />
                                                </td>
                                                <td>{packMats.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => setPackMats(packMats.filter((_, i) => i !== idx))}>✕</button>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <button className="add-line-btn" onClick={() => setPackMats([...packMats, { itemId: '', quantity: 0 }])}>+ Add Packing Material</button>
                        </div>

                        <div style={{ marginTop: 20 }}>
                            <button className="btn btn-success w-full" onClick={handleSubmit}>Complete Packing Run</button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Table */}
            <div className="history-section">
                <div className="section-header">
                    <h3>Packing History</h3>
                    <span className="record-count">{data.packingRuns.length} records</span>
                </div>
                {!data.packingRuns.length ? (
                    <div className="empty-state"><div className="icon">📦</div><p>No packing runs yet. Complete a production batch first, then pack!</p></div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Pack ID</th>
                                <th>Date</th>
                                <th>Finished Good</th>
                                <th>Qty Packed</th>
                                <th>Bulk Used</th>
                                <th>FG Cost/Unit</th>
                                <th>Source</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...data.packingRuns].reverse().map(pr => {
                                const fg = data.items.find(i => i.id === pr.fgItemId);
                                const bulk = data.items.find(i => i.id === pr.bulkItemId);
                                return (
                                    <tr key={pr.id}>
                                        <td><span className="mono">{pr.id}</span></td>
                                        <td>{pr.date}</td>
                                        <td><strong>{fg?.name}</strong></td>
                                        <td><strong>{pr.outputQuantity.toLocaleString()}</strong> pcs</td>
                                        <td>{pr.bulkConsumed} KG <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>({bulk?.name})</span></td>
                                        <td><strong className="text-primary">₹{pr.fgCostPerUnit}</strong></td>
                                        <td><span className="mono">{pr.sourceBatchId}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
