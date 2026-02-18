import React from 'react';
import { Table, Tag, Tabs, Empty, Button } from 'antd';
import { BarChartOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useDemo } from '../DemoContext';
import { ITEMS, ITEM_TYPE_LABELS, ITEM_TYPE_COLORS, type ItemType } from '../data/mockMasters';
import { formatCurrency } from '../data/calculations';

export default function ReportsStep() {
    const { state, dispatch, stockSummary } = useDemo();

    React.useEffect(() => { dispatch({ type: 'COMPLETE_STEP', step: 7 }); }, []);

    // Stock Ledger
    const stockData = ITEMS.map(it => {
        const s = state.stock[it.id] ?? { qty: 0, avgCost: 0 };
        return { key: it.id, ...it, qty: s.qty, avgCost: s.avgCost, totalValue: s.qty * s.avgCost };
    }).filter(r => r.qty > 0);

    const stockCols = [
        { title: 'Item', dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
        { title: 'Type', dataIndex: 'type', key: 'type', width: 140, render: (v: ItemType) => <Tag color={ITEM_TYPE_COLORS[v]}>{ITEM_TYPE_LABELS[v]}</Tag> },
        { title: 'Qty', key: 'qty', width: 100, render: (_: any, r: any) => <span style={{ fontFamily: 'JetBrains Mono' }}>{r.qty.toFixed(r.unit === 'KG' ? 1 : 0)}</span> },
        { title: 'Unit', dataIndex: 'unit', key: 'unit', width: 60 },
        { title: 'Avg Cost', key: 'avg', width: 120, render: (_: any, r: any) => <span style={{ fontFamily: 'JetBrains Mono' }}>{formatCurrency(r.avgCost)}</span> },
        { title: 'Total Value', key: 'val', width: 140, render: (_: any, r: any) => <strong style={{ fontFamily: 'JetBrains Mono', color: '#7D1111' }}>{formatCurrency(r.totalValue)}</strong> },
    ];

    // Transaction Log
    const txnCols = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 100, render: (v: string) => <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>{v}</span> },
        { title: 'Date', dataIndex: 'date', key: 'date', width: 120 },
        {
            title: 'Type', dataIndex: 'type', key: 'type', width: 130, render: (v: string) => {
                const colors: Record<string, string> = { GRN: 'blue', PRODUCTION: 'orange', THIRD_PARTY: 'purple', PACKING: 'green', DISPATCH: 'red' };
                return <Tag color={colors[v] ?? 'default'}>{v.replace('_', ' ')}</Tag>;
            }
        },
        { title: 'Description', dataIndex: 'description', key: 'desc' },
        {
            title: 'Items', key: 'items', render: (_: any, r: any) => r.entries.map((e: any, i: number) => (
                <div key={i} style={{ fontSize: 12 }}><span style={{ color: e.direction === 'in' ? '#52c41a' : '#ff4d4f' }}>{e.direction === 'in' ? '+' : '−'}</span> {e.qty} {e.unit} {e.itemName} ({formatCurrency(e.value)})</div>
            ))
        },
    ];

    // Batches
    const batchCols = [
        { title: 'Batch No', dataIndex: 'batchNo', key: 'bn', render: (v: string) => <strong style={{ fontFamily: 'JetBrains Mono' }}>{v}</strong> },
        { title: 'Product', dataIndex: 'productName', key: 'prod' },
        { title: 'Type', dataIndex: 'type', key: 'type', render: (v: string) => <Tag color={v === 'production' ? 'orange' : 'green'}>{v}</Tag> },
        { title: 'Input', key: 'in', render: (_: any, r: any) => `${r.inputQty.toFixed(1)} KG` },
        { title: 'Output', key: 'out', render: (_: any, r: any) => r.type === 'packing' ? `${r.outputQty} PCS` : `${r.outputQty.toFixed(1)} KG` },
        { title: 'Wastage', key: 'w', render: (_: any, r: any) => <span style={{ color: r.wastage > 0 ? '#faad14' : '#52c41a' }}>{r.wastage.toFixed(1)} KG</span> },
        { title: 'Yield %', key: 'y', render: (_: any, r: any) => <span style={{ fontWeight: 600, color: r.yieldPct < 95 ? '#ff4d4f' : '#52c41a' }}>{r.yieldPct.toFixed(1)}%</span> },
        { title: 'Cost/Unit', key: 'c', render: (_: any, r: any) => <span style={{ fontFamily: 'JetBrains Mono' }}>{formatCurrency(r.costPerUnit)}</span> },
    ];

    return (
        <div className="demo-step-card">
            <div className="demo-step-header">
                <h2><BarChartOutlined /> Reports Dashboard</h2>
                <p>Real-time visibility into stock positions, valuations, production yields, and complete transaction history.</p>
            </div>

            {/* Value Pipeline */}
            <div className="demo-section-title">📊 Stock Value Pipeline</div>
            <div className="demo-value-pipeline">
                {[
                    { icon: '📦', label: 'Raw Materials', value: stockSummary.raw },
                    { icon: '🏭', label: 'Bulk Powder', value: stockSummary.bulk },
                    { icon: '📋', label: 'Packing', value: stockSummary.packing },
                    { icon: '🎁', label: 'Finished Goods', value: stockSummary.fg },
                ].map((s, i) => (
                    <React.Fragment key={s.label}>
                        {i > 0 && <span className="demo-pipeline-arrow">→</span>}
                        <div className="demo-pipeline-stage">
                            <div className="stage-icon">{s.icon}</div>
                            <div className="stage-label">{s.label}</div>
                            <div className="stage-value">{formatCurrency(s.value)}</div>
                        </div>
                    </React.Fragment>
                ))}
            </div>
            <div style={{ textAlign: 'center', margin: '8px 0 24px' }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 24, fontWeight: 800, color: '#7D1111' }}>
                    💰 Total Inventory Value: {formatCurrency(stockSummary.total)}
                </span>
            </div>

            <Tabs items={[
                {
                    key: 'stock', label: `📦 Stock Ledger (${stockData.length})`, children: stockData.length > 0
                        ? <Table size="small" dataSource={stockData} columns={stockCols} pagination={false}
                            summary={() => <Table.Summary.Row><Table.Summary.Cell index={0} colSpan={5}><strong>Grand Total</strong></Table.Summary.Cell><Table.Summary.Cell index={1}><strong style={{ fontFamily: 'JetBrains Mono', color: '#7D1111', fontSize: 16 }}>{formatCurrency(stockSummary.total)}</strong></Table.Summary.Cell></Table.Summary.Row>} />
                        : <Empty description="No stock movements yet — complete the earlier steps first" />
                },
                {
                    key: 'batches', label: `🏭 Batches (${state.batches.length})`, children: state.batches.length > 0
                        ? <Table size="small" dataSource={state.batches.map((b, i) => ({ ...b, key: i }))} columns={batchCols} pagination={false} />
                        : <Empty description="No batches recorded" />
                },
                {
                    key: 'txns', label: `📜 Transactions (${state.transactions.length})`, children: state.transactions.length > 0
                        ? <Table size="small" dataSource={[...state.transactions].reverse().map((t, i) => ({ ...t, key: i }))} columns={txnCols} pagination={false} />
                        : <Empty description="No transactions yet" />
                },
            ]} />

            <div style={{ textAlign: 'center', marginTop: 32, padding: 24, background: '#F6FFED', borderRadius: 16 }}>
                <CheckCircleOutlined style={{ fontSize: 40, color: '#52c41a', marginBottom: 8 }} />
                <h3 style={{ color: '#333', margin: '8px 0 4px' }}>🎉 Demo Complete!</h3>
                <p style={{ color: '#666', maxWidth: 480, margin: '0 auto' }}>
                    You've walked through the complete business workflow — from raw material procurement through production, packing, and dispatch.
                    The system tracks stock value in real-time at every transformation stage.
                </p>
                <Button type="primary" size="large" style={{ marginTop: 16, borderRadius: 12 }}
                    onClick={() => { dispatch({ type: 'RESET' }); dispatch({ type: 'SET_STEP', step: 0 }); }}>
                    🔄 Restart Demo
                </Button>
            </div>
        </div>
    );
}
