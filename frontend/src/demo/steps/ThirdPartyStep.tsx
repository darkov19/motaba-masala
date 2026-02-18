import React, { useState } from 'react';
import { Select, InputNumber, Button, message, Alert, Space, Descriptions } from 'antd';
import { ArrowRightOutlined, ShopOutlined } from '@ant-design/icons';
import { useDemo } from '../DemoContext';
import { SUPPLIERS, getItemsByType, getItemName } from '../data/mockMasters';
import { formatCurrency } from '../data/calculations';

export default function ThirdPartyStep() {
    const { state, dispatch } = useDemo();
    const [supplier, setSupplier] = useState('');
    const [itemId, setItemId] = useState('');
    const [qty, setQty] = useState<number>(0);
    const [unitCost, setUnitCost] = useState<number>(0);
    const [submitted, setSubmitted] = useState(false);

    const bulkItems = getItemsByType('BULK');

    const submit = () => {
        if (!supplier || !itemId || qty <= 0 || unitCost <= 0) { message.error('Fill all fields'); return; }
        const supName = SUPPLIERS.find(s => s.id === supplier)?.name ?? supplier;
        dispatch({ type: 'PROCESS_THIRD_PARTY', supplierName: supName, itemId, qty, unitCost });
        setSubmitted(true);
        message.success(`Third-party bulk received — ${qty} KG from ${supName}`);
    };

    const goNext = () => { dispatch({ type: 'COMPLETE_STEP', step: 4 }); dispatch({ type: 'SET_STEP', step: 5 }); };

    return (
        <div className="demo-step-card">
            <div className="demo-step-header">
                <h2><ShopOutlined /> Third-Party Bulk Procurement</h2>
                <p>When in-house production is insufficient, procure bulk powder directly from external suppliers. This stock is tracked as <strong>"External"</strong> source for traceability.</p>
            </div>

            <Alert type="warning" showIcon message="Backup Flow" description="This is used when in-house production cannot meet demand. The externally procured bulk is repacked under your own brand."
                style={{ marginBottom: 20, borderRadius: 12 }} />

            {!submitted ? (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div>
                            <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>External Supplier</label>
                            <Select style={{ width: '100%' }} placeholder="Select supplier" value={supplier || undefined} onChange={setSupplier}
                                options={SUPPLIERS.map(s => ({ value: s.id, label: `${s.name} — ${s.location}` }))} />
                        </div>
                        <div>
                            <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>Bulk Product</label>
                            <Select style={{ width: '100%' }} placeholder="Select bulk item" value={itemId || undefined} onChange={setItemId}
                                options={bulkItems.map(it => ({ value: it.id, label: it.name }))} />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                        <div>
                            <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>Quantity (KG)</label>
                            <InputNumber style={{ width: '100%' }} min={1} value={qty || undefined} placeholder="KG" onChange={v => setQty(v ?? 0)} />
                        </div>
                        <div>
                            <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>Unit Cost (₹/KG)</label>
                            <InputNumber style={{ width: '100%' }} min={0} step={0.5} value={unitCost || undefined} placeholder="₹/KG" onChange={v => setUnitCost(v ?? 0)} />
                        </div>
                        <div>
                            <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>Total Value</label>
                            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 20, fontWeight: 700, color: '#7D1111', paddingTop: 4 }}>
                                {formatCurrency(qty * unitCost)}
                            </div>
                        </div>
                    </div>

                    {itemId && (
                        <Descriptions size="small" bordered column={2} style={{ marginBottom: 16 }}>
                            <Descriptions.Item label="Current Stock">{(state.stock[itemId]?.qty ?? 0).toFixed(1)} KG</Descriptions.Item>
                            <Descriptions.Item label="After Receipt">{((state.stock[itemId]?.qty ?? 0) + qty).toFixed(1)} KG</Descriptions.Item>
                        </Descriptions>
                    )}

                    <div className="demo-step-actions">
                        <Button size="large" onClick={goNext} style={{ borderRadius: 12 }}>
                            ⏭️ Skip — Go to Packing
                        </Button>
                        <Button type="primary" size="large" onClick={submit} disabled={!supplier || !itemId || qty <= 0} style={{ borderRadius: 12 }}>
                            ✅ Receive External Bulk
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <Alert type="success" showIcon message="Third-Party Bulk Received!"
                        description={`${qty} KG of ${getItemName(itemId)} received at ${formatCurrency(unitCost)}/KG. Total: ${formatCurrency(qty * unitCost)}. Source tagged as External.`}
                        style={{ marginBottom: 20, borderRadius: 12 }} />
                    <Space>
                        <Button onClick={() => { setSubmitted(false); setSupplier(''); setItemId(''); setQty(0); setUnitCost(0); }}>Add More</Button>
                        <Button type="primary" size="large" onClick={goNext} style={{ borderRadius: 12 }}>
                            Continue to Packing <ArrowRightOutlined />
                        </Button>
                    </Space>
                </>
            )}
        </div>
    );
}
