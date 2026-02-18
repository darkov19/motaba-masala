import { useState, useMemo } from 'react';
import { Table, Button, Modal, Form, Select, InputNumber, Tag, Space, message, Descriptions, Alert, Empty } from 'antd';
import { PlusOutlined, InboxOutlined } from '@ant-design/icons';
import { useDemo } from '../data/DemoContext';
import type { PackingMaterialUsed } from '../types';

export default function Packing() {
    const { state, dispatch } = useDemo();
    const [packModal, setPackModal] = useState(false);
    const [packForm] = Form.useForm();
    const [selectedSource, setSelectedSource] = useState<string>('');

    // Build a combined list of bulk sources: completed batches + third-party GRNs
    const bulkSources = useMemo(() => {
        const sources: Array<{ id: string; label: string; type: 'InHouse' | 'External'; bulkItemId: string; availableKg: number }> = [];

        // In-house completed batches
        state.productionBatches.filter(b => b.status === 'Completed').forEach(b => {
            const recipe = state.recipes.find(r => r.id === b.recipeId);
            const bulkItem = state.items.find(i => i.id === recipe?.outputItemId);
            if (bulkItem) {
                sources.push({
                    id: b.id,
                    label: `${b.id} — ${bulkItem.name} (In-House)`,
                    type: 'InHouse',
                    bulkItemId: bulkItem.id,
                    availableKg: bulkItem.currentStock,
                });
            }
        });

        // Third-party bulk GRNs
        state.grnEntries.filter(g => g.type === 'ThirdPartyBulk').forEach(g => {
            g.items.forEach(li => {
                const bulkItem = state.items.find(i => i.id === li.itemId);
                if (bulkItem) {
                    sources.push({
                        id: g.id,
                        label: `${g.id} — ${bulkItem.name} (Third-Party)`,
                        type: 'External',
                        bulkItemId: bulkItem.id,
                        availableKg: bulkItem.currentStock,
                    });
                }
            });
        });

        return sources;
    }, [state]);

    const fgItems = state.items.filter(i => i.type === 'FG');
    const packingMaterials = state.items.filter(i => i.type === 'PACKING');

    const handlePack = (values: Record<string, unknown>) => {
        const outputQty = values.outputQty as number;
        const materials: PackingMaterialUsed[] = (values.packingMaterials as Array<{ itemId: string; qty: number }>)
            ?.filter(p => p?.itemId && p?.qty) ?? [];

        dispatch({
            type: 'CREATE_PACKING_RUN',
            payload: {
                sourceBatchId: values.sourceBatchId as string,
                outputItemId: values.outputItemId as string,
                outputQty,
                packingMaterials: materials,
            },
        });
        setPackModal(false);
        packForm.resetFields();
        setSelectedSource('');
        message.success('Packing run completed — FG stock updated!');
    };

    const columns = [
        { title: 'Packing ID', dataIndex: 'id', key: 'id', render: (t: string) => <strong>{t}</strong> },
        {
            title: 'Source', dataIndex: 'sourceType', key: 'source',
            render: (t: string) => (
                <span className={`source-tag ${t === 'InHouse' ? 'inhouse' : 'external'}`}>
                    {t === 'InHouse' ? '🏭 In-House' : '🔄 External'}
                </span>
            ),
        },
        { title: 'Source Batch', dataIndex: 'sourceBatchId', key: 'batch' },
        {
            title: 'Output Product', key: 'output',
            render: (_: unknown, r: { outputItemId: string }) => state.items.find(i => i.id === r.outputItemId)?.name ?? '—',
        },
        { title: 'Output Qty', dataIndex: 'outputQty', key: 'qty', render: (v: number) => `${v} PCS` },
        { title: 'Bulk Used', dataIndex: 'bulkConsumed', key: 'bulk', render: (v: number) => `${v} KG` },
        { title: 'Cost/Unit', dataIndex: 'costPerUnit', key: 'cost', render: (v: number) => `₹${v.toFixed(2)}` },
        {
            title: 'Status', dataIndex: 'status', key: 'status',
            render: (s: string) => <Tag color={s === 'Completed' ? '#10B981' : '#F59E0B'}>{s}</Tag>,
        },
        { title: 'Date', dataIndex: 'date', key: 'date', render: (d: string) => new Date(d).toLocaleDateString() },
    ];

    const currentSource = bulkSources.find(s => s.id === selectedSource);

    return (
        <>
            <div className="content-header">
                <h2>📦 Packing</h2>
                <div className="header-desc">Step 4 — Convert bulk powder into retail packs (In-House or Third-Party)</div>
            </div>
            <div className="content-body">
                {/* FG Stock quick view */}
                <div className="stat-grid">
                    {fgItems.map(item => (
                        <div key={item.id} className="stat-card">
                            <div className="stat-label">{item.name}</div>
                            <div className="stat-value">{item.currentStock} <span className="stat-unit">PCS</span></div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                Cost: ₹{item.avgCost.toFixed(2)}/pc
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setPackModal(true)}>Start Packing Run</Button>
                </div>

                {state.packingRuns.length === 0 ? (
                    <Empty description="No packing runs yet. Complete a production batch or procure third-party bulk first!" />
                ) : (
                    <Table dataSource={state.packingRuns} columns={columns} rowKey="id" size="small" pagination={false} />
                )}
            </div>

            {/* Packing Run Modal */}
            <Modal title="New Packing Run" open={packModal} onCancel={() => { setPackModal(false); setSelectedSource(''); }} footer={null} destroyOnClose width={600}>
                <Form form={packForm} layout="vertical" onFinish={handlePack}>
                    <Form.Item name="sourceBatchId" label="Source (Bulk Batch or Third-Party GRN)" rules={[{ required: true }]}>
                        <Select
                            options={bulkSources.map(s => ({ label: s.label, value: s.id }))}
                            onChange={(v) => setSelectedSource(v)}
                            placeholder="Select source..."
                        />
                    </Form.Item>

                    {currentSource && (
                        <Alert
                            message={`Source: ${currentSource.type === 'InHouse' ? '🏭 In-House Production' : '🔄 Third-Party Bulk'}`}
                            description={`Available: ${currentSource.availableKg} KG`}
                            type={currentSource.type === 'InHouse' ? 'info' : 'warning'}
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                    )}

                    <Form.Item name="outputItemId" label="Finished Good to Produce" rules={[{ required: true }]}>
                        <Select options={fgItems.map(i => ({ label: `${i.name} (${i.packWeight}g)`, value: i.id }))} />
                    </Form.Item>

                    <Form.Item name="outputQty" label="Quantity to Pack (Pieces)" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={1} />
                    </Form.Item>

                    <div className="section-title">Packing Materials Used</div>
                    <Form.List name="packingMaterials" initialValue={[{}]}>
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(field => (
                                    <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="start">
                                        <Form.Item name={[field.name, 'itemId']} rules={[{ required: true }]}>
                                            <Select placeholder="Material" style={{ width: 200 }} options={packingMaterials.map(i => ({ label: i.name, value: i.id }))} />
                                        </Form.Item>
                                        <Form.Item name={[field.name, 'qty']} rules={[{ required: true }]}>
                                            <InputNumber placeholder="Qty" min={1} style={{ width: 120 }} />
                                        </Form.Item>
                                        <Button danger onClick={() => remove(field.name)} size="small">✕</Button>
                                    </Space>
                                ))}
                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Add Packing Material</Button>
                            </>
                        )}
                    </Form.List>

                    <Form.Item style={{ marginTop: 16 }}>
                        <Button type="primary" htmlType="submit" block icon={<InboxOutlined />}>Complete Packing Run</Button>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}
