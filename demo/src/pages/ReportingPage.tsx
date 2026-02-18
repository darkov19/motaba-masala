import { useState } from 'react';
import { useDemo } from '../App';
import { getValueByType, getTotalValue, getItemsByType } from '../store/demoStore';

export default function ReportingPage() {
    const { data } = useDemo();
    const [reportTab, setReportTab] = useState<'ledger' | 'yield' | 'transactions'>('ledger');
    const fmt = (v: number) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    const rawVal = getValueByType(data, 'RAW');
    const bulkVal = getValueByType(data, 'BULK');
    const packVal = getValueByType(data, 'PACKING');
    const fgVal = getValueByType(data, 'FG');
    const totalVal = getTotalValue(data);
    const completedBatches = data.batches.filter(b => b.status === 'COMPLETED');
    const avgYield = completedBatches.length > 0 ? (completedBatches.reduce((s, b) => s + b.yieldPct, 0) / completedBatches.length).toFixed(1) : '—';
    const totalWaste = Number(completedBatches.reduce((s, b) => s + b.wastage, 0).toFixed(2));
    const totalDisp = data.dispatches.reduce((s, d) => s + d.totalValue, 0);

    return (
        <div>
            <h1 className="page-title">Reports & Analytics</h1>
            <p className="page-subtitle">Real-time inventory valuation, production yields, and transaction history.</p>

            {/* KPI Cards */}
            <div className="stats-row">
                <div className="stat-card raw"><div className="stat-label">Raw Materials</div><div className="stat-value">{fmt(rawVal)}</div><div className="stat-sub">{getItemsByType(data, 'RAW').reduce((s, i) => s + i.currentStock, 0).toFixed(0)} KG total</div></div>
                <div className="stat-card bulk"><div className="stat-label">Bulk Powders</div><div className="stat-value">{fmt(bulkVal)}</div><div className="stat-sub">{getItemsByType(data, 'BULK').reduce((s, i) => s + i.currentStock, 0).toFixed(1)} KG total</div></div>
                <div className="stat-card packing"><div className="stat-label">Packing Materials</div><div className="stat-value">{fmt(packVal)}</div><div className="stat-sub">{getItemsByType(data, 'PACKING').reduce((s, i) => s + i.currentStock, 0).toLocaleString()} pcs</div></div>
                <div className="stat-card fg"><div className="stat-label">Finished Goods</div><div className="stat-value">{fmt(fgVal)}</div><div className="stat-sub">{getItemsByType(data, 'FG').reduce((s, i) => s + i.currentStock, 0).toLocaleString()} pcs</div></div>
            </div>

            <div className="stats-row">
                <div className="stat-card"><div className="stat-label">Total Inventory Value</div><div className="stat-value text-primary">{fmt(totalVal)}</div></div>
                <div className="stat-card"><div className="stat-label">Avg Production Yield</div><div className="stat-value text-success">{avgYield}%</div><div className="stat-sub">{completedBatches.length} batches</div></div>
                <div className="stat-card"><div className="stat-label">Total Wastage</div><div className="stat-value text-danger">{totalWaste} KG</div></div>
                <div className="stat-card"><div className="stat-label">Total Dispatched</div><div className="stat-value">{fmt(totalDisp)}</div><div className="stat-sub">{data.dispatches.length} orders</div></div>
            </div>

            {/* Report Tabs */}
            <div className="tabs" style={{ marginTop: 24 }}>
                <button className={`tab ${reportTab === 'ledger' ? 'active' : ''}`} onClick={() => setReportTab('ledger')}>Stock Ledger</button>
                <button className={`tab ${reportTab === 'yield' ? 'active' : ''}`} onClick={() => setReportTab('yield')}>Production Yield Analysis</button>
                <button className={`tab ${reportTab === 'transactions' ? 'active' : ''}`} onClick={() => setReportTab('transactions')}>Transaction Log</button>
            </div>

            {/* Content Area */}
            <div className="history-section" style={{ borderTopLeftRadius: 0 }}>
                {reportTab === 'ledger' && (
                    <>
                        <div className="section-header">
                            <h3>Stock Ledger</h3>
                            <span className="record-count">{data.items.filter(i => i.currentStock > 0).length} items</span>
                        </div>
                        <table>
                            <thead><tr><th>Item</th><th>Type</th><th>Qty</th><th>Unit</th><th>Avg Cost</th><th>Total Value</th></tr></thead>
                            <tbody>
                                {data.items.filter(i => i.currentStock > 0).sort((a, b) => a.type.localeCompare(b.type)).map(it => (
                                    <tr key={it.id}>
                                        <td><strong>{it.name}</strong></td>
                                        <td><span className={`badge-type badge-${it.type.toLowerCase()}`}>{it.type}</span></td>
                                        <td className={it.currentStock <= it.reorderLevel ? 'text-danger' : ''}><strong>{it.currentStock.toLocaleString()}</strong></td>
                                        <td>{it.baseUnit}</td>
                                        <td className="currency">₹{it.avgCost.toFixed(2)}</td>
                                        <td className="currency"><strong>{fmt(Math.round(it.currentStock * it.avgCost))}</strong></td>
                                    </tr>
                                ))}
                                {data.items.filter(i => i.currentStock > 0).length === 0 && (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>No items in stock</td></tr>
                                )}
                            </tbody>
                        </table>
                    </>
                )}

                {reportTab === 'yield' && (
                    <>
                        <div className="section-header">
                            <h3>Production Yield Analysis</h3>
                            <span className="record-count">{completedBatches.length} batches</span>
                        </div>
                        {!completedBatches.length ? (
                            <div className="empty-state" style={{ padding: '60px 0' }}><div className="icon">📈</div><p>Complete production batches to see yield data</p></div>
                        ) : (
                            <table>
                                <thead><tr><th>Batch ID</th><th>Recipe</th><th>Output</th><th>Waste</th><th>Yield</th><th>Cost/KG</th></tr></thead>
                                <tbody>
                                    {completedBatches.map(b => {
                                        const r = data.recipes.find(x => x.id === b.recipeId);
                                        const expectedWaste = r?.expectedWastePct || 0;
                                        return (
                                            <tr key={b.id}>
                                                <td className="mono">{b.id}</td>
                                                <td>{r?.name}</td>
                                                <td><strong>{b.actualOutput} KG</strong></td>
                                                <td className="text-danger">{Number(b.wastage.toFixed(2))} KG</td>
                                                <td className={b.yieldPct >= (100 - expectedWaste) ? 'text-success' : 'text-danger'}><strong>{b.yieldPct}%</strong></td>
                                                <td className="currency">₹{b.costPerUnit}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </>
                )}

                {reportTab === 'transactions' && (
                    <>
                        <div className="section-header">
                            <h3>Transaction Log</h3>
                            <span className="record-count">Last 50 of {data.transactions.length}</span>
                        </div>
                        {!data.transactions.length ? (
                            <div className="empty-state" style={{ padding: '60px 0' }}><div className="icon">📋</div><p>No transactions yet. Start operating to see the audit trail!</p></div>
                        ) : (
                            <table>
                                <thead><tr><th>ID</th><th>Date</th><th>Type</th><th>Item</th><th>Qty</th><th>Reference</th><th>Description</th></tr></thead>
                                <tbody>
                                    {[...data.transactions].reverse().slice(0, 50).map(tx => {
                                        const item = data.items.find(i => i.id === tx.itemId);
                                        const typeColors: Record<string, string> = { GRN: 'var(--color-info)', PRODUCTION_IN: 'var(--color-success)', PRODUCTION_OUT: 'var(--color-danger)', PACKING_IN: 'var(--color-fg)', PACKING_OUT: 'var(--color-warning)', DISPATCH: 'var(--color-raw)' };
                                        return (
                                            <tr key={tx.id}>
                                                <td className="mono" style={{ fontSize: '0.72rem' }}>{tx.id}</td>
                                                <td>{tx.date}</td>
                                                <td><span style={{ color: typeColors[tx.type] || 'var(--text-primary)', fontWeight: 600, fontSize: '0.75rem' }}>{tx.type.replace(/_/g, ' ')}</span></td>
                                                <td>{item?.name}</td>
                                                <td style={{ color: tx.quantity > 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>{tx.quantity > 0 ? '+' : ''}{tx.quantity}</td>
                                                <td className="mono" style={{ fontSize: '0.72rem' }}>{tx.reference}</td>
                                                <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{tx.description}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
