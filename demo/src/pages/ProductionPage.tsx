import { useState } from 'react';
import { useDemo } from '../App';
import { createBatch, completeBatch } from '../store/demoStore';

export default function ProductionPage() {
    const { data, setData, toast } = useDemo();
    const [recipeId, setRecipeId] = useState('');
    const [plannedInputs, setPlannedInputs] = useState<Record<string, number>>({});
    const [activeBatch, setActiveBatch] = useState<string | null>(null);
    const [actuals, setActuals] = useState<Record<string, number>>({});
    const [output, setOutput] = useState(0);
    const [formOpen, setFormOpen] = useState(true);

    const handleRecipeSelect = (id: string) => {
        setRecipeId(id);
        if (id) {
            const r = data.recipes.find(x => x.id === id)!;
            const initialInputs: Record<string, number> = {};
            r.ingredients.forEach(ing => { initialInputs[ing.itemId] = ing.quantity; });
            setPlannedInputs(initialInputs);
        } else {
            setPlannedInputs({});
        }
    };

    const targetedOutput = Object.values(plannedInputs).reduce((s, v) => s + (v || 0), 0);

    const handleCreate = () => {
        if (!recipeId || targetedOutput <= 0) { toast('Select recipe and enter input quantities', 'error'); return; }
        const inputs = Object.entries(plannedInputs).map(([itemId, quantity]) => ({ itemId, quantity }));
        try {
            setData(createBatch(data, recipeId, inputs));
            toast('Batch created! Click "Execute" to start production.');
            setRecipeId(''); setPlannedInputs({});
        } catch (e: any) { toast(e.message, 'error'); }
    };

    const handleExecute = (batchId: string) => {
        const batch = data.batches.find(b => b.id === batchId)!;
        const defaults: Record<string, number> = {};
        batch.consumedMaterials.forEach(cm => { defaults[cm.itemId] = cm.standardQty; });
        setActuals(defaults);
        setOutput(batch.plannedQty);
        setActiveBatch(batchId);
        setFormOpen(true);
    };

    const activeBatchData = activeBatch ? data.batches.find(b => b.id === activeBatch) : null;
    const computedWastage = activeBatchData ? Math.max(0, activeBatchData.plannedQty - output) : 0;

    const handleComplete = () => {
        if (!activeBatch) return;
        const batch = data.batches.find(b => b.id === activeBatch)!;
        const consumptions = batch.consumedMaterials.map(cm => ({
            itemId: cm.itemId, actualQty: actuals[cm.itemId] || 0,
        }));
        if (output <= 0) { toast('Enter output quantity', 'error'); return; }
        try {
            setData(completeBatch(data, activeBatch, consumptions, output, computedWastage));
            toast(`Batch ${activeBatch} completed! Yield: ${(output / batch.plannedQty * 100).toFixed(1)}%`);
            setActiveBatch(null);
        } catch (e: any) { toast(e.message, 'error'); }
    };

    const planned = data.batches.filter(b => b.status === 'PLANNED');
    const completed = data.batches.filter(b => b.status === 'COMPLETED');

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
                <div>
                    <h1 className="page-title">Production</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>Create batches, execute production, and track yields.</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setFormOpen(!formOpen); if (activeBatch) setActiveBatch(null); }}>
                    {formOpen ? 'Hide Form' : '+ New Batch'}
                </button>
            </div>

            {/* Create or Execute Form */}
            {formOpen && (
                <div className="form-panel" style={{ marginBottom: 24 }}>
                    <div style={{ padding: 24 }}>
                        {!activeBatch ? (
                            <>
                                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>Create Production Batch</h3>
                                <div className="form-group">
                                    <label>Recipe</label>
                                    <select value={recipeId} onChange={e => handleRecipeSelect(e.target.value)}>
                                        <option value="">Select recipe...</option>
                                        {data.recipes.map(r => {
                                            const out = data.items.find(i => i.id === r.outputItemId);
                                            return <option key={r.id} value={r.id}>{r.name} → {out?.name}</option>;
                                        })}
                                    </select>
                                </div>

                                {recipeId && (
                                    <>
                                        <label>Planned Input Quantities (KG)</label>
                                        <div className="table-container" style={{ marginBottom: 12 }}>
                                            <table>
                                                <thead>
                                                    <tr><th>Ingredient</th><th style={{ width: 150 }}>Quantity (KG)</th></tr>
                                                </thead>
                                                <tbody>
                                                    {Object.entries(plannedInputs).map(([itemId, qty]) => {
                                                        const item = data.items.find(i => i.id === itemId);
                                                        return (
                                                            <tr key={itemId}>
                                                                <td>{item?.name} <span className="mono">({itemId})</span></td>
                                                                <td>
                                                                    <input
                                                                        type="number"
                                                                        value={qty || ''}
                                                                        onChange={e => setPlannedInputs({ ...plannedInputs, [itemId]: +e.target.value })}
                                                                        placeholder="Qty KG"
                                                                        style={{ margin: 0 }}
                                                                    />
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="preview-strip">
                                            Targeted Output: <strong style={{ color: 'var(--color-primary)' }}>{targetedOutput.toFixed(2)} KG</strong>
                                        </div>
                                    </>
                                )}

                                <div style={{ marginTop: 20 }}>
                                    <button className="btn btn-primary w-full" onClick={handleCreate} disabled={targetedOutput <= 0}>Create Batch</button>
                                </div>
                            </>
                        ) : (() => {
                            const batch = data.batches.find(b => b.id === activeBatch)!;
                            const recipe = data.recipes.find(r => r.id === batch.recipeId)!;
                            const totalInput = Object.values(actuals).reduce((s, v) => s + v, 0);
                            const yieldPct = batch.plannedQty > 0 ? ((output / batch.plannedQty) * 100).toFixed(1) : '0';
                            let totalCost = 0;
                            batch.consumedMaterials.forEach(cm => {
                                const it = data.items.find(i => i.id === cm.itemId);
                                totalCost += (actuals[cm.itemId] || 0) * (it?.avgCost || 0);
                            });
                            const costPerKg = output > 0 ? (totalCost / output).toFixed(2) : '0';

                            return (
                                <>
                                    <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
                                        <div>
                                            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Execute Batch: {activeBatch}</h3>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0 }}>Recipe: {recipe.name} · Targeted: {batch.plannedQty} KG</p>
                                        </div>
                                        <span className="badge-status badge-in-progress">IN PROGRESS</span>
                                    </div>

                                    <label>Material Consumption (Actuals)</label>
                                    <div className="table-container" style={{ marginBottom: 16 }}>
                                        <table>
                                            <thead>
                                                <tr><th>Material</th><th>Available</th><th>Planned</th><th style={{ width: 140 }}>Actual (KG)</th></tr>
                                            </thead>
                                            <tbody>
                                                {batch.consumedMaterials.map(cm => {
                                                    const item = data.items.find(i => i.id === cm.itemId)!;
                                                    return (
                                                        <tr key={cm.itemId}>
                                                            <td><strong>{item.name}</strong></td>
                                                            <td>{item.currentStock} KG</td>
                                                            <td>{cm.standardQty} KG</td>
                                                            <td>
                                                                <input type="number" value={actuals[cm.itemId] || ''} onChange={e => setActuals({ ...actuals, [cm.itemId]: +e.target.value })} placeholder="Actual KG" style={{ margin: 0 }} />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Actual Output (KG)</label>
                                            <input type="number" value={output || ''} onChange={e => setOutput(+e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>Wastage (KG)</label>
                                            <input type="number" value={computedWastage.toFixed(2)} readOnly style={{ background: 'var(--bg-elevated)', color: 'var(--text-dim)', cursor: 'not-allowed' }} />
                                        </div>
                                    </div>

                                    <div className="stats-row" style={{ marginTop: 16 }}>
                                        <div className="stat-card"><div className="stat-label">Yield</div><div className="stat-value text-success">{yieldPct}%</div></div>
                                        <div className="stat-card"><div className="stat-label">Cost/KG</div><div className="stat-value text-primary">₹{costPerKg}</div></div>
                                        <div className="stat-card"><div className="stat-label">Total Cost</div><div className="stat-value">₹{Math.round(totalCost).toLocaleString('en-IN')}</div></div>
                                    </div>

                                    <div className="btn-group" style={{ marginTop: 20 }}>
                                        <button className="btn btn-outline" onClick={() => setActiveBatch(null)}>Cancel</button>
                                        <button className="btn btn-success" style={{ flex: 1 }} onClick={handleComplete}>Complete Batch</button>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Planned Batches */}
            {planned.length > 0 && (
                <div className="history-section" style={{ marginBottom: 24 }}>
                    <div className="section-header">
                        <h3>Planned Batches</h3>
                        <span className="record-count">{planned.length} pending</span>
                    </div>
                    <table>
                        <thead>
                            <tr><th>Batch ID</th><th>Date</th><th>Recipe</th><th>Targeted Output</th><th>Status</th><th style={{ width: 100 }}></th></tr>
                        </thead>
                        <tbody>
                            {planned.map(b => {
                                const r = data.recipes.find(x => x.id === b.recipeId)!;
                                return (
                                    <tr key={b.id}>
                                        <td><span className="mono">{b.id}</span></td>
                                        <td>{b.date}</td>
                                        <td><strong>{r.name}</strong></td>
                                        <td>{b.plannedQty} KG</td>
                                        <td><span className="badge-status badge-planned">PLANNED</span></td>
                                        <td><button className="btn btn-primary btn-sm" onClick={() => handleExecute(b.id)} disabled={!!activeBatch}>Execute</button></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Completed Batches */}
            <div className="history-section">
                <div className="section-header">
                    <h3>Completed Batches</h3>
                    <span className="record-count">{completed.length} records</span>
                </div>
                {!completed.length ? (
                    <div className="empty-state"><div className="icon">🏭</div><p>No completed batches yet</p></div>
                ) : (
                    <table>
                        <thead>
                            <tr><th>Batch ID</th><th>Date</th><th>Recipe</th><th>Output</th><th>Waste</th><th>Yield</th><th>Cost/KG</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                            {completed.map(b => {
                                const r = data.recipes.find(x => x.id === b.recipeId)!;
                                const out = data.items.find(i => i.id === r.outputItemId);
                                return (
                                    <tr key={b.id}>
                                        <td><span className="mono">{b.id}</span></td>
                                        <td>{b.date}</td>
                                        <td><strong>{r.name}</strong> <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>→ {out?.name}</span></td>
                                        <td><strong className="text-success">{b.actualOutput} KG</strong></td>
                                        <td><strong className="text-danger">{Number(b.wastage.toFixed(2))} KG</strong></td>
                                        <td><strong className={b.yieldPct >= 90 ? 'text-success' : 'text-warning'}>{b.yieldPct}%</strong></td>
                                        <td>₹{b.costPerUnit}/KG</td>
                                        <td><span className="badge-status badge-completed">COMPLETED</span></td>
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
