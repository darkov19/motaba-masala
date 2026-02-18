import { useMemo } from 'react';
import { Table, Tag } from 'antd';
import {
    DollarOutlined,
    ExperimentOutlined,
    InboxOutlined,
    ShoppingOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import { useDemo } from '../data/DemoContext';
import type { ItemType } from '../types';

const typeLabels: Record<ItemType, string> = {
    RAW: 'Raw Material', BULK: 'Bulk Powder', PACKING: 'Packing Material', FG: 'Finished Good',
};
const typeColors: Record<ItemType, string> = {
    RAW: '#3B82F6', BULK: '#F59E0B', PACKING: '#8B5CF6', FG: '#10B981',
};

export default function Dashboard() {
    const { state } = useDemo();

    // Compute stock value by stage
    const stockByStage = useMemo(() => {
        const stages: Record<ItemType, { qty: number; value: number; items: number }> = {
            RAW: { qty: 0, value: 0, items: 0 },
            BULK: { qty: 0, value: 0, items: 0 },
            PACKING: { qty: 0, value: 0, items: 0 },
            FG: { qty: 0, value: 0, items: 0 },
        };
        state.items.forEach(item => {
            const v = item.currentStock * item.avgCost;
            stages[item.type].qty += item.currentStock;
            stages[item.type].value += v;
            if (item.currentStock > 0) stages[item.type].items++;
        });
        return stages;
    }, [state.items]);

    const totalValue = Object.values(stockByStage).reduce((s, v) => s + v.value, 0);

    // Wastage analysis
    const wastageData = useMemo(() => {
        return state.productionBatches
            .filter(b => b.status === 'Completed')
            .map(b => {
                const recipe = state.recipes.find(r => r.id === b.recipeId);
                const totalInput = b.consumedMaterials.reduce((s, c) => s + c.actualQty, 0);
                const lossPercent = totalInput > 0 ? Math.round(((totalInput - b.outputQty) / totalInput) * 100 * 100) / 100 : 0;
                return {
                    id: b.id,
                    recipe: recipe?.name ?? '—',
                    totalInput,
                    output: b.outputQty,
                    wastage: b.wastageQty,
                    yieldPercent: b.yieldPercent,
                    lossPercent,
                    expectedWastage: recipe?.expectedWastagePercent ?? 0,
                    overThreshold: lossPercent > (recipe?.expectedWastagePercent ?? 100),
                };
            });
    }, [state.productionBatches, state.recipes]);

    // Stock ledger columns
    const stockColumns = [
        {
            title: 'Item', dataIndex: 'name', key: 'name',
            render: (t: string) => <strong>{t}</strong>,
        },
        {
            title: 'Category', dataIndex: 'type', key: 'type',
            render: (t: ItemType) => <Tag color={typeColors[t]}>{typeLabels[t]}</Tag>,
        },
        { title: 'Qty', dataIndex: 'currentStock', key: 'stock', render: (v: number) => v.toLocaleString() },
        { title: 'Unit', dataIndex: 'baseUnit', key: 'unit' },
        { title: 'Avg Cost (₹)', dataIndex: 'avgCost', key: 'cost', render: (v: number) => `₹${v.toFixed(2)}` },
        {
            title: 'Total Value (₹)', key: 'totalValue',
            render: (_: unknown, r: { currentStock: number; avgCost: number }) => (
                <strong>₹{(r.currentStock * r.avgCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
            ),
        },
        {
            title: 'Status', key: 'status',
            render: (_: unknown, r: { currentStock: number; reorderLevel: number }) => (
                <span className={`stock-badge ${r.currentStock > r.reorderLevel ? 'ok' : r.currentStock > 0 ? 'low' : 'critical'}`}>
                    {r.currentStock > r.reorderLevel ? '✓ OK' : r.currentStock > 0 ? '⚠ Low' : '✕ Empty'}
                </span>
            ),
        },
    ];

    // Wastage columns
    const wastageColumns = [
        { title: 'Batch', dataIndex: 'id', key: 'id', render: (t: string) => <strong>{t}</strong> },
        { title: 'Recipe', dataIndex: 'recipe', key: 'recipe' },
        { title: 'Input (KG)', dataIndex: 'totalInput', key: 'input' },
        { title: 'Output (KG)', dataIndex: 'output', key: 'output' },
        {
            title: 'Wastage (KG)', dataIndex: 'wastage', key: 'wastage',
            render: (v: number) => <span style={{ color: 'var(--status-danger)' }}>{v}</span>,
        },
        {
            title: 'Loss %', dataIndex: 'lossPercent', key: 'loss',
            render: (v: number, r: { overThreshold: boolean }) => (
                <span style={{ color: r.overThreshold ? 'var(--status-danger)' : 'var(--status-success)', fontWeight: 700 }}>
                    {v}%{r.overThreshold ? ' ⚠' : ''}
                </span>
            ),
        },
        {
            title: 'Expected', dataIndex: 'expectedWastage', key: 'expected',
            render: (v: number) => `${v}%`,
        },
        {
            title: 'Yield %', dataIndex: 'yieldPercent', key: 'yield',
            render: (v: number) => <span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{v}%</span>,
        },
    ];

    // Movement log columns
    const movementColumns = [
        {
            title: 'Time', dataIndex: 'timestamp', key: 'time',
            render: (v: string) => new Date(v).toLocaleString(),
        },
        {
            title: 'Item', key: 'item',
            render: (_: unknown, r: { itemId: string }) => state.items.find(i => i.id === r.itemId)?.name ?? r.itemId,
        },
        {
            title: 'Type', dataIndex: 'type', key: 'type',
            render: (t: string) => {
                const colors: Record<string, string> = {
                    GRN: '#3B82F6', PRODUCTION_CONSUME: '#F59E0B', PRODUCTION_OUTPUT: '#10B981',
                    WASTAGE: '#EF4444', PACK_BULK_DEDUCT: '#8B5CF6', PACK_MATERIAL_DEDUCT: '#8B5CF6',
                    PACK_FG_ADD: '#10B981', DISPATCH: '#3B82F6',
                };
                return <Tag color={colors[t] ?? '#666'}>{t.replace(/_/g, ' ')}</Tag>;
            },
        },
        {
            title: 'Qty', dataIndex: 'qty', key: 'qty',
            render: (v: number) => (
                <span style={{ color: v >= 0 ? 'var(--status-success)' : 'var(--status-danger)', fontWeight: 600 }}>
                    {v >= 0 ? '+' : ''}{v}
                </span>
            ),
        },
        { title: 'Ref', dataIndex: 'referenceId', key: 'ref' },
        { title: 'Description', dataIndex: 'description', key: 'desc' },
    ];

    const stageCards = [
        { type: 'RAW' as const, icon: <ShoppingOutlined />, color: '#3B82F6' },
        { type: 'BULK' as const, icon: <ExperimentOutlined />, color: '#F59E0B' },
        { type: 'PACKING' as const, icon: <InboxOutlined />, color: '#8B5CF6' },
        { type: 'FG' as const, icon: <DollarOutlined />, color: '#10B981' },
    ];

    return (
        <>
            <div className="content-header">
                <h2>📊 Dashboard</h2>
                <div className="header-desc">Step 6 — Real-time stock value, wastage analysis, and movement log</div>
            </div>
            <div className="content-body">
                {/* Total inventory value */}
                <div className="stat-card pulse-glow" style={{ marginBottom: 24, textAlign: 'center', borderColor: 'var(--border-active)' }}>
                    <div className="stat-label">Total Inventory Value</div>
                    <div className="stat-value" style={{ fontSize: '2.5rem', color: 'var(--motaba-gold)' }}>
                        ₹{totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        Across {state.items.filter(i => i.currentStock > 0).length} active items • {state.stockMovements.length} total movements
                    </div>
                </div>

                {/* Stage-wise cards */}
                <div className="stat-grid">
                    {stageCards.map(({ type, icon, color }) => (
                        <div key={type} className="stat-card" style={{ borderLeft: `3px solid ${color}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div className="stat-label">{typeLabels[type]}</div>
                                <span style={{ fontSize: '1.2rem', color }}>{icon}</span>
                            </div>
                            <div className="stat-value">₹{stockByStage[type].value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                {stockByStage[type].items} items in stock
                            </div>
                        </div>
                    ))}
                </div>

                {/* Stock Ledger */}
                <div className="section-title">📋 Stock Ledger</div>
                <Table
                    dataSource={state.items}
                    columns={stockColumns}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    style={{ marginBottom: 32 }}
                    summary={() => (
                        <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={5}><strong>Grand Total</strong></Table.Summary.Cell>
                            <Table.Summary.Cell index={5}>
                                <strong style={{ color: 'var(--motaba-gold)', fontSize: '1rem' }}>
                                    ₹{totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={6} />
                        </Table.Summary.Row>
                    )}
                />

                {/* Wastage Analysis */}
                {wastageData.length > 0 && (
                    <>
                        <div className="section-title"><WarningOutlined style={{ color: 'var(--status-danger)' }} /> Wastage Analysis</div>
                        <Table
                            dataSource={wastageData}
                            columns={wastageColumns}
                            rowKey="id"
                            size="small"
                            pagination={false}
                            style={{ marginBottom: 32 }}
                        />
                    </>
                )}

                {/* Stock Movement Timeline */}
                {state.stockMovements.length > 0 && (
                    <>
                        <div className="section-title">📜 Stock Movement Log</div>
                        <Table
                            dataSource={[...state.stockMovements].reverse()}
                            columns={movementColumns}
                            rowKey="id"
                            size="small"
                            pagination={{ pageSize: 10 }}
                        />
                    </>
                )}
            </div>
        </>
    );
}
