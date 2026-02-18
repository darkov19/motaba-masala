import { useState } from 'react';
import { useDemo } from '../App';
import { processGRN } from '../store/demoStore';

export default function ProcurementPage() {
    const { data, setData, toast } = useDemo();
    const [supplierId, setSupplierId] = useState('');
    const [invoiceNum, setInvoiceNum] = useState('');
    const [lines, setLines] = useState([{ itemId: '', quantity: 0, unitPrice: 0 }]);
    const [formOpen, setFormOpen] = useState(true);

    const receivableItems = data.items.filter(i => i.type === 'RAW' || i.type === 'PACKING' || i.type === 'BULK');

    const handleSubmit = () => {
        if (!supplierId) { toast('Select a supplier', 'error'); return; }
        if (!invoiceNum) { toast('Enter invoice number', 'error'); return; }
        const valid = lines.filter(l => l.itemId && l.quantity > 0 && l.unitPrice > 0);
        if (!valid.length) { toast('Add at least one valid line', 'error'); return; }
        try {
            setData(processGRN(data, supplierId, invoiceNum, valid));
            toast(`GRN created with ${valid.length} item(s)`);
            setSupplierId(''); setInvoiceNum(''); setLines([{ itemId: '', quantity: 0, unitPrice: 0 }]);
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
                    <h1 className="page-title">Procurement / GRN</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>Record incoming materials. Stock and costs update automatically on submission.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setFormOpen(!formOpen)}>
                    {formOpen ? 'Hide Form' : '+ New GRN'}
                </button>
            </div>

            {/* Collapsible Form */}
            {formOpen && (
                <div className="form-panel" style={{ marginBottom: 24 }}>
                    <div style={{ padding: 24 }}>
                        <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>New Goods Received Note</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Supplier</label>
                                <select value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                                    <option value="">Select supplier...</option>
                                    {data.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Invoice #</label>
                                <input value={invoiceNum} onChange={e => setInvoiceNum(e.target.value)} placeholder="INV-2026-001" />
                            </div>
                        </div>

                        <label>Line Items</label>
                        <div className="table-container" style={{ marginBottom: 12 }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th style={{ width: 120 }}>Quantity</th>
                                        <th style={{ width: 120 }}>Unit Price (₹)</th>
                                        <th style={{ width: 100 }}>Amount</th>
                                        <th style={{ width: 40 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.map((line, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <select value={line.itemId} onChange={e => updateLine(idx, 'itemId', e.target.value)} style={{ margin: 0 }}>
                                                    <option value="">Select item...</option>
                                                    {receivableItems.map(i => <option key={i.id} value={i.id}>{i.name} ({i.type})</option>)}
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
                        <button className="add-line-btn" onClick={() => setLines([...lines, { itemId: '', quantity: 0, unitPrice: 0 }])}>+ Add Line</button>

                        <div className="form-summary-bar">
                            <div>
                                <span className="total-label">Grand Total: </span>
                                <span className="total-value">₹{grandTotal.toLocaleString('en-IN')}</span>
                            </div>
                            <button className="btn btn-success" onClick={handleSubmit}>Create GRN</button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Table */}
            <div className="history-section">
                <div className="section-header">
                    <h3>GRN History</h3>
                    <span className="record-count">{data.grns.length} records</span>
                </div>
                {!data.grns.length ? (
                    <div className="empty-state"><div className="icon">📋</div><p>No GRNs yet. Create one to see materials flow in!</p></div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>GRN ID</th>
                                <th>Date</th>
                                <th>Supplier</th>
                                <th>Invoice #</th>
                                <th>Items</th>
                                <th>Total Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...data.grns].reverse().map(grn => {
                                const sup = data.suppliers.find(s => s.id === grn.supplierId);
                                const tot = grn.items.reduce((s, gi) => s + gi.quantity * gi.unitPrice, 0);
                                return (
                                    <tr key={grn.id}>
                                        <td><span className="mono">{grn.id}</span></td>
                                        <td>{grn.date}</td>
                                        <td><strong>{sup?.name}</strong></td>
                                        <td>{grn.invoiceNumber}</td>
                                        <td>
                                            <div style={{ fontSize: '0.8rem' }}>
                                                {grn.items.map((gi, idx) => {
                                                    const item = data.items.find(i => i.id === gi.itemId);
                                                    return (
                                                        <div key={idx} style={{ padding: '2px 0' }}>
                                                            {item?.name}: {gi.quantity} × ₹{gi.unitPrice}
                                                            <span className="mono" style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--text-dim)' }}>Lot:{gi.lotNumber}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td><strong style={{ color: 'var(--color-primary)' }}>₹{tot.toLocaleString('en-IN')}</strong></td>
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
