import { useState } from 'react';
import { useDemo } from '../App';
import { processGRN } from '../store/demoStore';

export default function ProcurementPage() {
    const { data, setData, toast } = useDemo();
    const [supplierId, setSupplierId] = useState('');
    const [invoiceNum, setInvoiceNum] = useState('');
    const [lines, setLines] = useState([{ itemId: '', quantity: 0, unitPrice: 0 }]);

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
            <h1 className="page-title">📦 Procurement / GRN</h1>
            <p className="page-subtitle">Record incoming materials. Stock and costs update automatically on submission.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div className="card">
                    <div className="card-title" style={{ marginBottom: 20 }}>New Goods Received Note</div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Supplier</label>
                            <select value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                                <option value="">Select...</option>
                                {data.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Invoice #</label>
                            <input value={invoiceNum} onChange={e => setInvoiceNum(e.target.value)} placeholder="INV-2026-001" />
                        </div>
                    </div>
                    <label>Line Items</label>
                    {lines.map((line, idx) => (
                        <div key={idx} className="flex gap-8 mb-16" style={{ alignItems: 'end' }}>
                            <div style={{ flex: 3 }}>
                                <select value={line.itemId} onChange={e => updateLine(idx, 'itemId', e.target.value)}>
                                    <option value="">Select item...</option>
                                    {receivableItems.map(i => <option key={i.id} value={i.id}>{i.name} ({i.type})</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 1 }}><input type="number" value={line.quantity || ''} onChange={e => updateLine(idx, 'quantity', +e.target.value)} placeholder="Qty" /></div>
                            <div style={{ flex: 1 }}><input type="number" value={line.unitPrice || ''} onChange={e => updateLine(idx, 'unitPrice', +e.target.value)} placeholder="₹/Unit" /></div>
                            <div style={{ flex: 1, padding: '10px 0', fontWeight: 600, color: 'var(--color-primary)' }}>₹{(line.quantity * line.unitPrice).toLocaleString('en-IN')}</div>
                            {lines.length > 1 && <button className="btn btn-outline btn-sm" onClick={() => setLines(lines.filter((_, i) => i !== idx))}>✕</button>}
                        </div>
                    ))}
                    <button className="add-line-btn" onClick={() => setLines([...lines, { itemId: '', quantity: 0, unitPrice: 0 }])}>+ Add Line</button>
                    <div className="modal-actions">
                        <div style={{ flex: 1, fontWeight: 600 }}>Total: <span className="text-primary" style={{ fontSize: '1.1rem' }}>₹{grandTotal.toLocaleString('en-IN')}</span></div>
                        <button className="btn btn-success" onClick={handleSubmit}>✓ Create GRN</button>
                    </div>
                </div>

                <div className="card">
                    <div className="card-title" style={{ marginBottom: 20 }}>Recent GRNs ({data.grns.length})</div>
                    {!data.grns.length ? (
                        <div className="empty-state"><div className="icon">📭</div><p>No GRNs yet. Create one to see materials flow in!</p></div>
                    ) : [...data.grns].reverse().map(grn => {
                        const sup = data.suppliers.find(s => s.id === grn.supplierId);
                        const tot = grn.items.reduce((s, gi) => s + gi.quantity * gi.unitPrice, 0);
                        return (
                            <div key={grn.id} className="card" style={{ background: 'var(--bg-elevated)', padding: 16, marginBottom: 12 }}>
                                <div className="flex justify-between items-center"><strong className="mono">{grn.id}</strong><span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{grn.date}</span></div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '4px 0 8px' }}>{sup?.name} • Inv: {grn.invoiceNumber}</div>
                                {grn.items.map((gi, idx) => {
                                    const item = data.items.find(i => i.id === gi.itemId);
                                    return (<div key={idx} style={{ fontSize: '0.8rem', padding: '4px 0', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{item?.name} <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Lot:{gi.lotNumber}</span></span>
                                        <span>{gi.quantity} × ₹{gi.unitPrice} = <strong>₹{(gi.quantity * gi.unitPrice).toLocaleString('en-IN')}</strong></span>
                                    </div>);
                                })}
                                <div style={{ textAlign: 'right', marginTop: 8, fontWeight: 700, color: 'var(--color-primary)' }}>Total: ₹{tot.toLocaleString('en-IN')}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
