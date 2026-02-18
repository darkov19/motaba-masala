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
            <h1 className="page-title">🏭 Production</h1>
            <p className="page-subtitle">Create batches by specifying inputs. Targeted output is the sum of inputs. Recording actual output calculates wastage automatically.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Create / Execute */}
                <div>
                    {!activeBatch ? (
                        <div className="card">
                            <div className="card-title" style={{ marginBottom: 20 }}>Create Production Batch</div>
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
                                <div style={{ marginBottom: 20 }}>
                                    <label>Planned Input Quantities (KG)</label>
                                    {Object.entries(plannedInputs).map(([itemId, qty]) => {
                                        const item = data.items.find(i => i.id === itemId);
                                        return (
                                            <div key={itemId} className="flex gap-8 items-center mb-8">
                                                <div style={{ flex: 2, fontSize: '0.85rem' }}>{item?.name} ({itemId})</div>
                                                <input
                                                    type="number"
                                                    style={{ flex: 1 }}
                                                    value={qty || ''}
                                                    onChange={e => setPlannedInputs({ ...plannedInputs, [itemId]: +e.target.value })}
                                                    placeholder="Qty KG"
                                                />
                                            </div>
                                        );
                                    })}
                                    <div style={{ marginTop: 12, padding: '10px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', textAlign: 'right' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Targeted Output: </span>
                                        <strong style={{ fontSize: '1.1rem', color: 'var(--color-primary)' }}>{targetedOutput.toFixed(2)} KG</strong>
                                    </div>
                                </div>
                            )}

                            <button className="btn btn-primary w-full" onClick={handleCreate} disabled={targetedOutput <= 0}>🏭 Create Batch</button>
                        </div>
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
                            <div className="card" style={{ borderColor: 'var(--color-warning)' }}>
                                <div className="card-title" style={{ marginBottom: 4 }}>⚡ Execute Batch {activeBatch}</div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 16 }}>Recipe: {recipe.name} • Targeted: {batch.plannedQty} KG</p>

                                <label>Material Consumption (Actuals)</label>
                                {batch.consumedMaterials.map(cm => {
                                    const item = data.items.find(i => i.id === cm.itemId)!;
                                    return (
                                        <div key={cm.itemId} className="flex gap-8 items-center mb-16" style={{ fontSize: '0.85rem' }}>
                                            <div style={{ flex: 2 }}>
                                                <strong>{item.name}</strong>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Planned: {cm.standardQty} KG • Available: {item.currentStock} KG</div>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <input type="number" value={actuals[cm.itemId] || ''} onChange={e => setActuals({ ...actuals, [cm.itemId]: +e.target.value })} placeholder="Actual KG" />
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="form-row" style={{ marginTop: 16 }}>
                                    <div className="form-group">
                                        <label>Actual Output (KG)</label>
                                        <input type="number" value={output || ''} onChange={e => setOutput(+e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Wastage (KG)</label>
                                        <input type="number" value={computedWastage.toFixed(2)} readOnly style={{ background: 'var(--bg-secondary)', color: 'var(--text-dim)', cursor: 'not-allowed' }} />
                                    </div>
                                </div>

                                <div className="stats-row" style={{ marginTop: 16 }}>
                                    <div className="stat-card"><div className="stat-label">Yield</div><div className="stat-value text-success">{yieldPct}%</div></div>
                                    <div className="stat-card"><div className="stat-label">Cost/KG</div><div className="stat-value text-primary">₹{costPerKg}</div></div>
                                    <div className="stat-card"><div className="stat-label">Total Cost</div><div className="stat-value">₹{Math.round(totalCost).toLocaleString('en-IN')}</div></div>
                                </div>

                                <div className="btn-group" style={{ marginTop: 16 }}>
                                    <button className="btn btn-outline" onClick={() => setActiveBatch(null)}>Cancel</button>
                                    <button className="btn btn-success" style={{ flex: 1 }} onClick={handleComplete}>✓ Complete Batch</button>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Batch List */}
                <div>
                    {planned.length > 0 && (
                        <div className="card" style={{ marginBottom: 16 }}>
                            <div className="card-title" style={{ marginBottom: 16 }}>Planned Batches ({planned.length})</div>
                            {planned.map(b => {
                                const r = data.recipes.find(x => x.id === b.recipeId)!;
                                return (
                                    <div key={b.id} className="card" style={{ background: 'var(--bg-elevated)', padding: 14, marginBottom: 8 }}>
                                        <div className="flex justify-between items-center">
                                            <div><strong className="mono">{b.id}</strong> <span className="badge-status badge-planned">PLANNED</span></div>
                                            <button className="btn btn-primary btn-sm" onClick={() => handleExecute(b.id)} disabled={!!activeBatch}>▶ Execute</button>
                                        </div>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>{r.name} • Targeted: {b.plannedQty} KG • {b.date}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="card">
                        <div className="card-title" style={{ marginBottom: 16 }}>Completed Batches ({completed.length})</div>
                        {!completed.length ? (
                            <div className="empty-state"><div className="icon">🏭</div><p>No completed batches yet</p></div>
                        ) : completed.map(b => {
                            const r = data.recipes.find(x => x.id === b.recipeId)!;
                            const out = data.items.find(i => i.id === r.outputItemId);
                            return (
                                <div key={b.id} className="card" style={{ background: 'var(--bg-elevated)', padding: 14, marginBottom: 8 }}>
                                    <div className="flex justify-between items-center">
                                        <div><strong className="mono">{b.id}</strong> <span className="badge-status badge-completed">COMPLETED</span></div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{b.date}</span>
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>{r.name} → {out?.name}</div>
                                    <div className="flex gap-16" style={{ marginTop: 8, fontSize: '0.8rem' }}>
                                        <span>Output: <strong className="text-success">{b.actualOutput} KG</strong></span>
                                        <span>Waste: <strong className="text-danger">{b.wastage} KG</strong></span>
                                        <span>Yield: <strong className={b.yieldPct >= 90 ? 'text-success' : 'text-warning'}>{b.yieldPct}%</strong></span>
                                        <span>Cost: <strong className="text-primary">₹{b.costPerUnit}/KG</strong></span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
