import { useState } from 'react';
import { useDemo } from '../App';
import { createDispatch } from '../store/demoStore';

export default function DispatchPage() {
    const { data, setData, toast } = useDemo();
    const [customerId, setCustomerId] = useState('');
    const [lines, setLines] = useState([{ fgItemId: '', quantity: 0, unitPrice: 0 }]);

    const fgItems = data.items.filter(i => i.type === 'FG' && i.currentStock > 0);

    const handleSubmit = () => {
        if (!customerId) { toast('Select customer', 'error'); return; }
        const valid = lines.filter(l => l.fgItemId && l.quantity > 0 && l.unitPrice > 0);
        if (!valid.length) { toast('Add at least one item', 'error'); return; }
        try {
            setData(createDispatch(data, customerId, valid));
            const cust = data.customers.find(c => c.id === customerId);
            toast(`Dispatched to ${cust?.name}!`);
            setCustomerId(''); setLines([{ fgItemId: '', quantity: 0, unitPrice: 0 }]);
        } catch (e: any) { toast(e.message, 'error'); }
    };

    const updateLine = (i: number, f: string, v: any) => {
        const nl = [...lines]; nl[i] = { ...nl[i], [f]: v }; setLines(nl);
    };

    const grandTotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

    return (
        <div>
            <h1 className="page-title">🚛 Sales & Dispatch</h1>
            <p className="page-subtitle">Ship finished goods to customers. Stock is deducted using FIFO. Only finished goods with available stock can be dispatched.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div className="card">
                    <div className="card-title" style={{ marginBottom: 20 }}>New Dispatch Note</div>
                    <div className="form-group">
                        <label>Customer</label>
                        <select value={customerId} onChange={e => setCustomerId(e.target.value)}>
                            <option value="">Select customer...</option>
                            {data.customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.channel})</option>)}
                        </select>
                    </div>

                    <label>Items to Dispatch</label>
                    {lines.map((line, idx) => (
                        <div key={idx} className="flex gap-8 mb-16" style={{ alignItems: 'end' }}>
                            <div style={{ flex: 3 }}>
                                <select value={line.fgItemId} onChange={e => updateLine(idx, 'fgItemId', e.target.value)}>
                                    <option value="">Select FG item...</option>
                                    {fgItems.map(fg => <option key={fg.id} value={fg.id}>{fg.name} (Stock: {fg.currentStock})</option>)}
                                    {data.items.filter(i => i.type === 'FG' && i.currentStock === 0).map(fg => (
                                        <option key={fg.id} value={fg.id} disabled>{fg.name} (Out of Stock)</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <input type="number" value={line.quantity || ''} onChange={e => updateLine(idx, 'quantity', +e.target.value)} placeholder="Qty" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <input type="number" value={line.unitPrice || ''} onChange={e => updateLine(idx, 'unitPrice', +e.target.value)} placeholder="₹/Unit" />
                            </div>
                            <div style={{ flex: 1, padding: '10px 0', fontWeight: 600, color: 'var(--color-primary)' }}>
                                ₹{(line.quantity * line.unitPrice).toLocaleString('en-IN')}
                            </div>
                            {lines.length > 1 && <button className="btn btn-outline btn-sm" onClick={() => setLines(lines.filter((_, i) => i !== idx))}>✕</button>}
                        </div>
                    ))}
                    <button className="add-line-btn" onClick={() => setLines([...lines, { fgItemId: '', quantity: 0, unitPrice: 0 }])}>+ Add Item</button>

                    {lines.some(l => l.fgItemId && l.quantity > 0) && (
                        <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: 12, marginTop: 16, fontSize: '0.82rem' }}>
                            <strong>Dispatch Summary:</strong>
                            <div style={{ marginTop: 6 }}>
                                {lines.filter(l => l.fgItemId && l.quantity > 0).map((l, i) => {
                                    const fg = data.items.find(x => x.id === l.fgItemId);
                                    const margin = fg ? ((l.unitPrice - fg.avgCost) / l.unitPrice * 100).toFixed(1) : '0';
                                    return (
                                        <div key={i} style={{ color: 'var(--text-secondary)', padding: '2px 0' }}>
                                            {fg?.name}: {l.quantity} pcs × ₹{l.unitPrice} = ₹{(l.quantity * l.unitPrice).toLocaleString('en-IN')}
                                            <span style={{ marginLeft: 8, color: Number(margin) > 0 ? 'var(--color-success)' : 'var(--color-danger)', fontSize: '0.75rem' }}>
                                                (Margin: {margin}%)
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="modal-actions">
                        <div style={{ flex: 1, fontWeight: 700 }}>Invoice Total: <span className="text-primary" style={{ fontSize: '1.2rem' }}>₹{grandTotal.toLocaleString('en-IN')}</span></div>
                        <button className="btn btn-success" onClick={handleSubmit}>🚛 Confirm & Dispatch</button>
                    </div>
                </div>

                <div className="card">
                    <div className="card-title" style={{ marginBottom: 20 }}>Dispatch History ({data.dispatches.length})</div>
                    {!data.dispatches.length ? (
                        <div className="empty-state"><div className="icon">🚛</div><p>No dispatches yet. Pack some finished goods first!</p></div>
                    ) : [...data.dispatches].reverse().map(d => {
                        const cust = data.customers.find(c => c.id === d.customerId);
                        return (
                            <div key={d.id} className="card" style={{ background: 'var(--bg-elevated)', padding: 14, marginBottom: 10 }}>
                                <div className="flex justify-between items-center">
                                    <div><strong className="mono">{d.id}</strong> <span className="badge-status badge-dispatched">DISPATCHED</span></div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{d.date}</span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 8px' }}>To: <strong>{cust?.name}</strong> ({cust?.channel})</div>
                                {d.items.map((di, idx) => {
                                    const fg = data.items.find(i => i.id === di.fgItemId);
                                    return (
                                        <div key={idx} style={{ fontSize: '0.8rem', padding: '3px 0', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{fg?.name}</span>
                                            <span>{di.quantity} × ₹{di.unitPrice} = <strong>₹{(di.quantity * di.unitPrice).toLocaleString('en-IN')}</strong></span>
                                        </div>
                                    );
                                })}
                                <div style={{ textAlign: 'right', marginTop: 8, fontWeight: 700, color: 'var(--color-primary)', fontSize: '1rem' }}>₹{d.totalValue.toLocaleString('en-IN')}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
