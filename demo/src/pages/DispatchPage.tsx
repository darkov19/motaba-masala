import { useState } from 'react';
import { useDemo } from '../App';
import { createDispatch } from '../store/demoStore';

export default function DispatchPage() {
    const { data, setData, toast } = useDemo();
    const [customerId, setCustomerId] = useState('');
    const [lines, setLines] = useState([{ fgItemId: '', quantity: 0, unitPrice: 0 }]);
    const [formOpen, setFormOpen] = useState(true);

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
            <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
                <div>
                    <h1 className="page-title">Sales & Dispatch</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>Ship finished goods to customers. Stock is deducted using FIFO.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setFormOpen(!formOpen)}>
                    {formOpen ? 'Hide Form' : '+ New Dispatch'}
                </button>
            </div>

            {/* Collapsible Form */}
            {formOpen && (
                <div className="form-panel" style={{ marginBottom: 24 }}>
                    <div style={{ padding: 24 }}>
                        <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>New Dispatch Note</h3>

                        <div className="form-group">
                            <label>Customer</label>
                            <select value={customerId} onChange={e => setCustomerId(e.target.value)}>
                                <option value="">Select customer...</option>
                                {data.customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.channel})</option>)}
                            </select>
                        </div>

                        <label>Items to Dispatch</label>
                        <div className="table-container" style={{ marginBottom: 12 }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Finished Good</th>
                                        <th style={{ width: 100 }}>Qty</th>
                                        <th style={{ width: 120 }}>Rate (₹/Unit)</th>
                                        <th style={{ width: 100 }}>Amount</th>
                                        <th style={{ width: 40 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.map((line, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <select value={line.fgItemId} onChange={e => updateLine(idx, 'fgItemId', e.target.value)} style={{ margin: 0 }}>
                                                    <option value="">Select FG item...</option>
                                                    {fgItems.map(fg => <option key={fg.id} value={fg.id}>{fg.name} (Stock: {fg.currentStock})</option>)}
                                                    {data.items.filter(i => i.type === 'FG' && i.currentStock === 0).map(fg => (
                                                        <option key={fg.id} value={fg.id} disabled>{fg.name} (Out of Stock)</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td><input type="number" value={line.quantity || ''} onChange={e => updateLine(idx, 'quantity', +e.target.value)} placeholder="0" style={{ margin: 0 }} /></td>
                                            <td><input type="number" value={line.unitPrice || ''} onChange={e => updateLine(idx, 'unitPrice', +e.target.value)} placeholder="0.00" style={{ margin: 0 }} /></td>
                                            <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>₹{(line.quantity * line.unitPrice).toLocaleString('en-IN')}</td>
                                            <td>{lines.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => setLines(lines.filter((_, i) => i !== idx))}>✕</button>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button className="add-line-btn" onClick={() => setLines([...lines, { fgItemId: '', quantity: 0, unitPrice: 0 }])}>+ Add Item</button>

                        {lines.some(l => l.fgItemId && l.quantity > 0) && (
                            <div className="preview-strip" style={{ marginTop: 12 }}>
                                <strong>Margin Preview:</strong>
                                <div style={{ marginTop: 4 }}>
                                    {lines.filter(l => l.fgItemId && l.quantity > 0).map((l, i) => {
                                        const fg = data.items.find(x => x.id === l.fgItemId);
                                        const margin = fg ? ((l.unitPrice - fg.avgCost) / l.unitPrice * 100).toFixed(1) : '0';
                                        return (
                                            <div key={i} style={{ color: 'var(--text-secondary)', padding: '2px 0', fontSize: '0.82rem' }}>
                                                {fg?.name}: {l.quantity} pcs × ₹{l.unitPrice}
                                                <span style={{ marginLeft: 8, color: Number(margin) > 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                                                    ({margin}% margin)
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="form-summary-bar">
                            <div>
                                <span className="total-label">Invoice Total: </span>
                                <span className="total-value">₹{grandTotal.toLocaleString('en-IN')}</span>
                            </div>
                            <button className="btn btn-success" onClick={handleSubmit}>Confirm & Dispatch</button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Table */}
            <div className="history-section">
                <div className="section-header">
                    <h3>Dispatch History</h3>
                    <span className="record-count">{data.dispatches.length} records</span>
                </div>
                {!data.dispatches.length ? (
                    <div className="empty-state"><div className="icon">🚚</div><p>No dispatches yet. Pack some finished goods first!</p></div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Dispatch ID</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Channel</th>
                                <th>Items</th>
                                <th>Total Value</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...data.dispatches].reverse().map(d => {
                                const cust = data.customers.find(c => c.id === d.customerId);
                                return (
                                    <tr key={d.id}>
                                        <td><span className="mono">{d.id}</span></td>
                                        <td>{d.date}</td>
                                        <td><strong>{cust?.name}</strong></td>
                                        <td>{cust?.channel}</td>
                                        <td>
                                            <div style={{ fontSize: '0.8rem' }}>
                                                {d.items.map((di, idx) => {
                                                    const fg = data.items.find(i => i.id === di.fgItemId);
                                                    return (
                                                        <div key={idx} style={{ padding: '2px 0' }}>
                                                            {fg?.name}: {di.quantity} × ₹{di.unitPrice}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td><strong style={{ color: 'var(--color-primary)' }}>₹{d.totalValue.toLocaleString('en-IN')}</strong></td>
                                        <td><span className="badge-status badge-dispatched">DISPATCHED</span></td>
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
