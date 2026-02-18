import { useState } from 'react';
import { useDemoContext } from '../data/DemoContext';
import { Card, Form, Select, InputNumber, Button, Typography, Tag, Divider, message, Alert, Descriptions, Space, Segmented, Table } from 'antd';
import { BoxPlotOutlined, CheckCircleOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function PackingStep() {
    const { state, dispatch } = useDemoContext();
    const [sourceType, setSourceType] = useState<'inhouse' | 'thirdparty'>('inhouse');
    const [selectedFGId, setSelectedFGId] = useState<string>('');
    const [bulkConsumed, setBulkConsumed] = useState<number>(0);
    const [unitsProduced, setUnitsProduced] = useState<number>(0);
    const [damagedPacks, setDamagedPacks] = useState<number>(0);
    const [packingMaterials, setPackingMaterials] = useState<{ itemId: string; itemName: string; quantity: number }[]>([]);
    const [selectedPMId, setSelectedPMId] = useState('');
    const [pmQty, setPmQty] = useState(0);

    const fgItems = state.items.filter(i => i.type === 'FINISHED_GOOD');
    const pmItems = state.items.filter(i => i.type === 'PACKING');
    const bulkStock = sourceType === 'inhouse'
        ? state.stock.filter(s => s.type === 'BULK_INHOUSE' && s.quantity > 0)
        : state.thirdPartyBulk.filter(s => s.quantity > 0);

    const selectedFG = state.items.find(i => i.id === selectedFGId);
    const expectedUnits = selectedFG?.packWeight ? Math.floor((bulkConsumed * 1000) / selectedFG.packWeight) : 0;

    const addPM = () => {
        if (!selectedPMId || pmQty <= 0) return;
        const pm = pmItems.find(i => i.id === selectedPMId);
        if (!pm) return;
        setPackingMaterials(prev => [...prev, { itemId: pm.id, itemName: pm.name, quantity: pmQty }]);
        setSelectedPMId(''); setPmQty(0);
    };

    const handleSubmit = () => {
        if (!selectedFGId || bulkConsumed <= 0 || unitsProduced <= 0) {
            message.error('Complete all fields'); return;
        }
        const run = {
            id: `PACK-${String(state.packingRuns.length + 1).padStart(3, '0')}`,
            date: dayjs().format('YYYY-MM-DD'),
            sourceBatchId: sourceType === 'inhouse' ? 'INHOUSE' : 'THIRDPARTY',
            sourceType,
            outputItemId: selectedFGId,
            outputItemName: selectedFG?.name || '',
            bulkConsumed,
            packingMaterialsConsumed: packingMaterials,
            unitsProduced,
            damagedPacks,
        };
        dispatch({ type: 'ADD_PACKING_RUN', run });
        dispatch({ type: 'ADD_NOTIFICATION', notification: { id: Date.now().toString(), message: `Packed ${unitsProduced} units of ${selectedFG?.name} from ${sourceType} bulk`, type: 'success' } });
        message.success('Packing run recorded!');
        setSelectedFGId(''); setBulkConsumed(0); setUnitsProduced(0); setDamagedPacks(0); setPackingMaterials([]);
    };

    return (
        <div className="step-content">
            <div className="step-header">
                <Title level={3} style={{ margin: 0 }}><BoxPlotOutlined style={{ marginRight: 8, color: '#7D1111' }} />Packing — Bulk to Finished Goods</Title>
                <Text type="secondary">Convert bulk powder into retail packs. Auto-deducts bulk powder & packing materials.</Text>
            </div>
            <Segmented value={sourceType} onChange={v => { setSourceType(v as 'inhouse' | 'thirdparty'); setSelectedFGId(''); setBulkConsumed(0); }}
                options={[{ value: 'inhouse', label: '🏭 In-House Bulk' }, { value: 'thirdparty', label: '🔄 Third-Party Bulk' }]}
                style={{ marginBottom: 20 }} block />
            {sourceType === 'thirdparty' && (
                <Alert message="Repacking third-party bulk into your own branded packaging" type="info" showIcon style={{ marginBottom: 16 }} />
            )}
            <div style={{ marginBottom: 16 }}>
                <Text strong>Available Bulk Stock ({sourceType === 'inhouse' ? 'In-House' : 'Third-Party'}):</Text>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {bulkStock.length > 0 ? bulkStock.map(s => (
                        <Tag key={s.itemId} color="purple">{s.itemName}: {s.quantity.toFixed(1)} KG (₹{s.value.toLocaleString('en-IN')})</Tag>
                    )) : <Text type="secondary" italic>No bulk stock available. Complete production or procurement first.</Text>}
                </div>
            </div>
            <Card title="New Packing Run">
                <Form layout="vertical">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item label="Output Product (Finished Good)">
                            <Select value={selectedFGId || undefined} onChange={setSelectedFGId} placeholder="Select FG..."
                                options={fgItems.map(i => ({ value: i.id, label: `${i.name} (${i.packWeight}g)` }))} />
                        </Form.Item>
                        <Form.Item label="Bulk Consumed (KG)">
                            <InputNumber value={bulkConsumed || undefined} onChange={v => setBulkConsumed(v || 0)} min={0} step={0.5} style={{ width: '100%' }} placeholder="KG of bulk powder" />
                        </Form.Item>
                    </div>
                    {selectedFG && bulkConsumed > 0 && (
                        <Alert message={`Expected yield: ~${expectedUnits} units of ${selectedFG.name} (${selectedFG.packWeight}g each)`} type="success" showIcon style={{ marginBottom: 16 }} />
                    )}
                    <Divider>Packing Materials Consumed</Divider>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 12, alignItems: 'end', marginBottom: 12 }}>
                        <Select value={selectedPMId || undefined} onChange={setSelectedPMId} placeholder="Select packing material"
                            options={pmItems.map(i => ({ value: i.id, label: `${i.name} (${i.unit})` }))} />
                        <InputNumber value={pmQty || undefined} onChange={v => setPmQty(v || 0)} min={0} placeholder="Qty" style={{ width: '100%' }} />
                        <Button icon={<PlusOutlined />} onClick={addPM}>Add</Button>
                    </div>
                    {packingMaterials.length > 0 && (
                        <Table dataSource={packingMaterials} rowKey={(_, i) => String(i)} size="small" pagination={false} columns={[
                            { title: 'Material', dataIndex: 'itemName' },
                            { title: 'Qty', dataIndex: 'quantity' },
                            { title: '', key: 'del', width: 50, render: (_, __, idx) => <Button danger size="small" icon={<MinusCircleOutlined />} onClick={() => setPackingMaterials(p => p.filter((_, i) => i !== idx))} /> },
                        ]} />
                    )}
                    <Divider>Output</Divider>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item label="Units Produced">
                            <InputNumber value={unitsProduced || undefined} onChange={v => setUnitsProduced(v || 0)} min={0} style={{ width: '100%' }} size="large" />
                        </Form.Item>
                        <Form.Item label="Damaged/Rejected Packs">
                            <InputNumber value={damagedPacks} onChange={v => setDamagedPacks(v || 0)} min={0} style={{ width: '100%' }} />
                        </Form.Item>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <Button type="primary" size="large" icon={<CheckCircleOutlined />} onClick={handleSubmit}
                            disabled={!selectedFGId || bulkConsumed <= 0 || unitsProduced <= 0}
                            style={{ background: '#7D1111', borderColor: '#7D1111' }}>Record Packing Run</Button>
                    </div>
                </Form>
            </Card>
            {state.packingRuns.length > 0 && (<>
                <Divider>Packing History</Divider>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                    {state.packingRuns.map(run => (
                        <Card key={run.id} size="small" title={<><BoxPlotOutlined /> {run.id}</>} extra={<Tag color={run.sourceType === 'inhouse' ? 'purple' : 'cyan'}>{run.sourceType}</Tag>}>
                            <Descriptions size="small" column={1}>
                                <Descriptions.Item label="Product">{run.outputItemName}</Descriptions.Item>
                                <Descriptions.Item label="Bulk Used">{run.bulkConsumed} KG</Descriptions.Item>
                                <Descriptions.Item label="Units Produced">{run.unitsProduced}</Descriptions.Item>
                                {run.damagedPacks > 0 && <Descriptions.Item label="Damaged">{run.damagedPacks}</Descriptions.Item>}
                            </Descriptions>
                        </Card>
                    ))}
                </div>
            </>)}
        </div>
    );
}
