import React, { useState } from 'react';
import { Select, InputNumber, Button, Table, message, Alert, Space } from 'antd';
import { ArrowRightOutlined, TruckOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useDemo } from '../DemoContext';
import { CUSTOMERS, getItemsByType, getItemName, getItemById } from '../data/mockMasters';
import { formatCurrency } from '../data/calculations';

interface DispatchLine { itemId: string; qty: number }

export default function DispatchStep() {
    const { state, dispatch } = useDemo();
    const [customer, setCustomer] = useState('');
    const [lines, setLines] = useState<DispatchLine[]>([]);
    const [submitted, setSubmitted] = useState(false);

    const fgItems = getItemsByType('FG').filter(it => (state.stock[it.id]?.qty ?? 0) > 0);

    const addLine = () => setLines([...lines, { itemId: '', qty: 0 }]);
    const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
    const updateLine = (i: number, field: keyof DispatchLine, val: any) => {
        const u = [...lines]; u[i] = { ...u[i], [field]: val }; setLines(u);
    };

    const totalValue = lines.reduce((s, l) => s + l.qty * (state.stock[l.itemId]?.avgCost ?? 0), 0);
    const totalUnits = lines.reduce((s, l) => s + l.qty, 0);
    const hasInsufficient = lines.some(l => l.qty > (state.stock[l.itemId]?.qty ?? 0));

    const submit = () => {
        if (!customer) { message.error('Select a customer'); return; }
        const valid = lines.filter(l => l.itemId && l.qty > 0);
        if (valid.length === 0) { message.error('Add at least one item'); return; }
        const custName = CUSTOMERS.find(c => c.id === customer)?.name ?? customer;
        dispatch({ type: 'PROCESS_DISPATCH', customerName: custName, items: valid });
        setSubmitted(true);
        message.success(`Dispatch recorded — ${totalUnits} units to ${custName}`);
    };

    const goNext = () => { dispatch({ type: 'COMPLETE_STEP', step: 6 }); dispatch({ type: 'SET_STEP', step: 7 }); };

    return (
        <div className="demo-step-card">
            <div className="demo-step-header">
                <h2><TruckOutlined /> Sales & Dispatch</h2>
                <p>Dispatch Finished Goods to customers. Only FG items can be dispatched (Bulk Powder cannot be sold directly).</p>
            </div>

            {!submitted ? (
                <>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>Customer</label>
                        <Select style={{ width: '100%' }} placeholder="Select customer" value={customer || undefined} onChange={setCustomer}
                            options={CUSTOMERS.map(c => ({ value: c.id, label: `${c.name} — ${c.channel} (${c.location})` }))} />
                    </div>

                    <div className="demo-section-title">Dispatch Items (Finished Goods Only)</div>
                    <Table size="small" dataSource={lines.map((l, i) => ({ ...l, key: i }))} pagination={false}
                        locale={{ emptyText: 'Click "Add Item" to begin' }}
                        columns={[
                            {
                                title: 'Product', key: 'item', width: '40%', render: (_: any, __: any, i: number) => (
                                    <Select style={{ width: '100%' }} placeholder="Select FG" value={lines[i].itemId || undefined}
                                        onChange={v => updateLine(i, 'itemId', v)}
                                        options={fgItems.map(it => ({ value: it.id, label: `${it.name} (Stock: ${(state.stock[it.id]?.qty ?? 0).toFixed(0)})` }))} />
                                )
                            },
                            {
                                title: 'Qty', key: 'qty', width: '20%', render: (_: any, __: any, i: number) => (
                                    <InputNumber style={{ width: '100%' }} min={1} max={state.stock[lines[i].itemId]?.qty ?? 9999}
                                        placeholder="PCS" value={lines[i].qty || undefined}
                                        status={lines[i].qty > (state.stock[lines[i].itemId]?.qty ?? 0) ? 'error' : undefined}
                                        onChange={v => updateLine(i, 'qty', v ?? 0)} />
                                )
                            },
                            {
                                title: 'Unit Value', key: 'uval', width: '15%', render: (_: any, __: any, i: number) => (
                                    <span style={{ fontFamily: 'JetBrains Mono' }}>{formatCurrency(state.stock[lines[i].itemId]?.avgCost ?? 0)}</span>
                                )
                            },
                            {
                                title: 'Cost Value', key: 'tval', width: '15%', render: (_: any, __: any, i: number) => (
                                    <strong style={{ fontFamily: 'JetBrains Mono' }}>{formatCurrency(lines[i].qty * (state.stock[lines[i].itemId]?.avgCost ?? 0))}</strong>
                                )
                            },
                            {
                                title: '', key: 'del', width: '5%', render: (_: any, __: any, i: number) => (
                                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeLine(i)} />
                                )
                            },
                        ]}
                        footer={() => (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Button type="dashed" icon={<PlusOutlined />} onClick={addLine}>Add Item</Button>
                                <strong style={{ fontFamily: 'JetBrains Mono', fontSize: 16 }}>Cost Value: {formatCurrency(totalValue)}</strong>
                            </div>
                        )}
                    />

                    <div className="demo-step-actions">
                        <Button type="primary" size="large" onClick={submit} disabled={lines.length === 0 || hasInsufficient} style={{ borderRadius: 12 }}>
                            🚚 Confirm Dispatch
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <Alert type="success" showIcon message="Dispatch Confirmed!"
                        description={`${totalUnits} units dispatched to ${CUSTOMERS.find(c => c.id === customer)?.name}. Cost value of goods: ${formatCurrency(totalValue)}`}
                        style={{ marginBottom: 20, borderRadius: 12 }} />
                    <Space>
                        <Button onClick={() => { setSubmitted(false); setCustomer(''); setLines([]); }}>New Dispatch</Button>
                        <Button type="primary" size="large" onClick={goNext} style={{ borderRadius: 12 }}>
                            View Reports <ArrowRightOutlined />
                        </Button>
                    </Space>
                </>
            )}
        </div>
    );
}
