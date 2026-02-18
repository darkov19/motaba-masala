import React, { useState, useMemo } from 'react';
import { Select, InputNumber, Button, message, Alert, Space, Descriptions } from 'antd';
import { ArrowRightOutlined, GiftOutlined } from '@ant-design/icons';
import { useDemo } from '../DemoContext';
import { getItemsByType, getItemName, getItemById } from '../data/mockMasters';
import { formatCurrency } from '../data/calculations';

export default function PackingStep() {
    const { state, dispatch } = useDemo();
    const [bulkId, setBulkId] = useState('');
    const [fgId, setFgId] = useState('');
    const [units, setUnits] = useState<number>(0);
    const [submitted, setSubmitted] = useState(false);

    const bulkItems = getItemsByType('BULK');
    const fgItems = getItemsByType('FG');
    const fgItem = getItemById(fgId);
    const packWeight = fgItem?.packWeight ?? 100;

    const bulkAvail = state.stock[bulkId]?.qty ?? 0;
    const bulkNeeded = (units * packWeight) / 1000;
    const maxUnits = bulkId ? Math.floor((bulkAvail * 1000) / packWeight) : 0;

    const pouchAvail = state.stock['PM-001']?.qty ?? 0;
    const boxAvail = state.stock['PM-002']?.qty ?? 0;
    const labelAvail = state.stock['PM-003']?.qty ?? 0;
    const boxesNeeded = Math.ceil(units / 20);

    const consumption = useMemo(() => [
        { label: getItemName(bulkId || 'BP-001'), needed: bulkNeeded, avail: bulkAvail, unit: 'KG', sufficient: bulkNeeded <= bulkAvail },
        { label: '100g Laminated Pouch', needed: units, avail: pouchAvail, unit: 'PCS', sufficient: units <= pouchAvail },
        { label: 'Label Sticker', needed: units, avail: labelAvail, unit: 'PCS', sufficient: units <= labelAvail },
        { label: 'Printed Box (20 Pouches)', needed: boxesNeeded, avail: boxAvail, unit: 'PCS', sufficient: boxesNeeded <= boxAvail },
    ], [bulkNeeded, bulkAvail, units, pouchAvail, labelAvail, boxesNeeded, boxAvail, bulkId]);

    const allSufficient = units > 0 && consumption.every(c => c.sufficient);

    const bulkCostPerKG = state.stock[bulkId]?.avgCost ?? 0;
    const pouchCost = state.stock['PM-001']?.avgCost ?? 2.5;
    const labelCost = state.stock['PM-003']?.avgCost ?? 0.5;
    const boxCostPerUnit = (state.stock['PM-002']?.avgCost ?? 18) / 20;
    const fgCostPerUnit = bulkCostPerKG * (packWeight / 1000) + pouchCost + labelCost + boxCostPerUnit;

    const submit = () => {
        if (!bulkId || !fgId || units <= 0) { message.error('Fill all fields'); return; }
        if (!allSufficient) { message.error('Insufficient materials'); return; }
        dispatch({ type: 'PROCESS_PACKING', bulkItemId: bulkId, fgItemId: fgId, units, packWeightG: packWeight });
        setSubmitted(true);
        message.success(`Packing complete — ${units} units of ${getItemName(fgId)} created`);
    };

    const goNext = () => { dispatch({ type: 'COMPLETE_STEP', step: 5 }); dispatch({ type: 'SET_STEP', step: 6 }); };

    return (
        <div className="demo-step-card">
            <div className="demo-step-header">
                <h2><GiftOutlined /> Packing Run</h2>
                <p>Convert Bulk Powder into Retail Packs. The system automatically deducts bulk powder and packing materials, and creates Finished Goods stock.</p>
            </div>

            {!submitted ? (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                        <div>
                            <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>Source (Bulk)</label>
                            <Select style={{ width: '100%' }} placeholder="Select bulk" value={bulkId || undefined} onChange={setBulkId}
                                options={bulkItems.map(it => ({ value: it.id, label: `${it.name} (${(state.stock[it.id]?.qty ?? 0).toFixed(1)} KG)` }))} />
                        </div>
                        <div>
                            <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>Finished Good</label>
                            <Select style={{ width: '100%' }} placeholder="Select FG" value={fgId || undefined} onChange={setFgId}
                                options={fgItems.map(it => ({ value: it.id, label: `${it.name} (${it.packWeight}g)` }))} />
                        </div>
                        <div>
                            <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>Units to Pack</label>
                            <InputNumber style={{ width: '100%' }} min={1} max={maxUnits || 99999} value={units || undefined}
                                placeholder={maxUnits > 0 ? `Max: ${maxUnits}` : 'Units'} onChange={v => setUnits(v ?? 0)} />
                        </div>
                    </div>

                    {units > 0 && bulkId && (
                        <>
                            <div className="demo-section-title">Material Consumption Breakdown</div>
                            {consumption.map((c, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: c.sufficient ? '#F6FFED' : '#FFF2F0', borderRadius: 8, marginBottom: 6 }}>
                                    <span style={{ fontWeight: 500 }}>{c.label}</span>
                                    <span>
                                        <strong>{c.needed.toFixed(c.unit === 'KG' ? 1 : 0)} {c.unit}</strong>
                                        <span style={{ color: '#999', marginLeft: 8 }}>(Avail: {c.avail.toFixed(c.unit === 'KG' ? 1 : 0)})</span>
                                        <span style={{ marginLeft: 8, color: c.sufficient ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>{c.sufficient ? '✓' : '✗'}</span>
                                    </span>
                                </div>
                            ))}

                            <div className="demo-info-row" style={{ marginTop: 16 }}>
                                <div className="demo-stat-card"><div className="label">Units</div><div className="value">{units}</div></div>
                                <div className="demo-stat-card"><div className="label">Boxes</div><div className="value">{boxesNeeded}</div></div>
                                <div className="demo-stat-card"><div className="label">Cost/Unit</div><div className="value">{formatCurrency(fgCostPerUnit)}</div></div>
                                <div className="demo-stat-card"><div className="label">Total FG Value</div><div className="value">{formatCurrency(units * fgCostPerUnit)}</div></div>
                            </div>
                        </>
                    )}

                    <div className="demo-step-actions">
                        <Button type="primary" size="large" onClick={submit} disabled={!allSufficient} style={{ borderRadius: 12 }}>
                            ✅ Complete Packing
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <Alert type="success" showIcon message="Packing Run Complete!"
                        description={`${units} units of ${getItemName(fgId)} created at ${formatCurrency(fgCostPerUnit)} each. Total FG value: ${formatCurrency(units * fgCostPerUnit)}`}
                        style={{ marginBottom: 20, borderRadius: 12 }} />
                    <Space>
                        <Button onClick={() => { setSubmitted(false); setBulkId(''); setFgId(''); setUnits(0); }}>Pack More</Button>
                        <Button type="primary" size="large" onClick={goNext} style={{ borderRadius: 12 }}>
                            Continue to Dispatch <ArrowRightOutlined />
                        </Button>
                    </Space>
                </>
            )}
        </div>
    );
}
