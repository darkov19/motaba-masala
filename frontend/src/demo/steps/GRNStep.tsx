import React, { useState } from 'react';
import { Form, Select, InputNumber, Button, Table, message, Alert, Space } from 'antd';
import { PlusOutlined, ArrowRightOutlined, DeleteOutlined } from '@ant-design/icons';
import { useDemo } from '../DemoContext';
import { SUPPLIERS, getItemsByType, STANDARD_COSTS, getItemName } from '../data/mockMasters';
import { formatCurrency } from '../data/calculations';

interface LineItem { itemId: string; qty: number; unitCost: number }

export default function GRNStep() {
    const { dispatch } = useDemo();
    const [supplier, setSupplier] = useState<string>('');
    const [lines, setLines] = useState<LineItem[]>([]);
    const [submitted, setSubmitted] = useState(false);

    const rawItems = getItemsByType('RAW');
    const packItems = getItemsByType('PACKING');
    const allItems = [...rawItems, ...packItems];

    const addLine = () => setLines([...lines, { itemId: '', qty: 0, unitCost: 0 }]);
    const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));

    const updateLine = (i: number, field: keyof LineItem, val: any) => {
        const updated = [...lines];
        updated[i] = { ...updated[i], [field]: val };
        if (field === 'itemId' && STANDARD_COSTS[val]) updated[i].unitCost = STANDARD_COSTS[val];
        setLines(updated);
    };

    const totalValue = lines.reduce((s, l) => s + l.qty * l.unitCost, 0);

    const submit = () => {
        if (!supplier) { message.error('Please select a supplier'); return; }
        const valid = lines.filter(l => l.itemId && l.qty > 0 && l.unitCost > 0);
        if (valid.length === 0) { message.error('Add at least one item'); return; }
        const supName = SUPPLIERS.find(s => s.id === supplier)?.name ?? supplier;
        dispatch({ type: 'PROCESS_GRN', supplierName: supName, items: valid });
        setSubmitted(true);
        message.success(`GRN recorded — ${valid.length} item(s) received from ${supName}`);
    };

    const goNext = () => { dispatch({ type: 'COMPLETE_STEP', step: 2 }); dispatch({ type: 'SET_STEP', step: 3 }); };

    return (
        <div className="demo-step-card">
            <div className="demo-step-header">
                <h2>📦 Goods Received Note (GRN)</h2>
                <p>Record incoming Raw Materials and Packing Materials from suppliers. Stock and cost will update automatically.</p>
            </div>

            {!submitted ? (
                <>
                    <Form layout="vertical">
                        <Form.Item label="Supplier" required>
                            <Select placeholder="Select supplier" value={supplier || undefined} onChange={setSupplier}
                                options={SUPPLIERS.map(s => ({ value: s.id, label: `${s.name} — ${s.location}` }))} />
                        </Form.Item>
                    </Form>

                    <div className="demo-section-title">Line Items</div>
                    <Table size="small" dataSource={lines.map((l, i) => ({ ...l, key: i }))} pagination={false}
                        locale={{ emptyText: 'Click "Add Item" to begin entering received goods' }}
                        columns={[
                            {
                                title: 'Item', key: 'item', width: '35%', render: (_: any, __: any, i: number) => (
                                    <Select style={{ width: '100%' }} placeholder="Select item" value={lines[i].itemId || undefined}
                                        onChange={v => updateLine(i, 'itemId', v)}
                                        options={allItems.map(it => ({ value: it.id, label: `${it.name} (${it.unit})` }))} />
                                )
                            },
                            {
                                title: 'Quantity', key: 'qty', width: '20%', render: (_: any, __: any, i: number) => (
                                    <InputNumber style={{ width: '100%' }} min={0} placeholder="Qty"
                                        value={lines[i].qty || undefined} onChange={v => updateLine(i, 'qty', v ?? 0)} />
                                )
                            },
                            {
                                title: 'Unit Cost (₹)', key: 'cost', width: '20%', render: (_: any, __: any, i: number) => (
                                    <InputNumber style={{ width: '100%' }} min={0} step={0.5} placeholder="₹ per unit"
                                        value={lines[i].unitCost || undefined} onChange={v => updateLine(i, 'unitCost', v ?? 0)} />
                                )
                            },
                            {
                                title: 'Value', key: 'val', width: '15%', render: (_: any, __: any, i: number) => (
                                    <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{formatCurrency(lines[i].qty * lines[i].unitCost)}</span>
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
                                <strong style={{ fontFamily: 'JetBrains Mono', fontSize: 16 }}>Total: {formatCurrency(totalValue)}</strong>
                            </div>
                        )}
                    />

                    <div className="demo-step-actions">
                        <Button type="primary" size="large" onClick={submit} disabled={lines.length === 0} style={{ borderRadius: 12 }}>
                            ✅ Receive Goods
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <Alert type="success" showIcon message="GRN Recorded Successfully!"
                        description={`${lines.length} item(s) received — Total value: ${formatCurrency(totalValue)}. Stock has been updated.`} style={{ marginBottom: 20, borderRadius: 12 }} />
                    <Space>
                        <Button onClick={() => { setSubmitted(false); setLines([]); setSupplier(''); }}>Add Another GRN</Button>
                        <Button type="primary" size="large" onClick={goNext} style={{ borderRadius: 12 }}>
                            Continue to Production <ArrowRightOutlined />
                        </Button>
                    </Space>
                </>
            )}
        </div>
    );
}
