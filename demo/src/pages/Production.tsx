import { useState } from 'react';
import { Table, Button, Modal, Form, Select, InputNumber, Tag, Space, message, Steps, Card, Descriptions, Alert, Empty } from 'antd';
import { PlusOutlined, ThunderboltOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useDemo } from '../data/DemoContext';
import type { ProductionBatch, ConsumedMaterial } from '../types';

export default function Production() {
    const { state, dispatch } = useDemo();
    const [createModal, setCreateModal] = useState(false);
    const [executeModal, setExecuteModal] = useState<ProductionBatch | null>(null);
    const [completeModal, setCompleteModal] = useState<ProductionBatch | null>(null);
    const [createForm] = Form.useForm();
    const [executeForm] = Form.useForm();
    const [completeForm] = Form.useForm();

    const handleCreate = (values: Record<string, unknown>) => {
        dispatch({ type: 'CREATE_BATCH', payload: { recipeId: values.recipeId as string } });
        setCreateModal(false);
        createForm.resetFields();
        message.success('Batch created with status: Planned');
    };

    const handleExecute = (values: Record<string, unknown>) => {
        if (!executeModal) return;
        const consumed: ConsumedMaterial[] = executeModal.consumedMaterials.map(cm => ({
            ...cm,
            actualQty: (values[`actual_${cm.itemId}`] as number) || 0,
        }));

        // Validate stock availability
        for (const c of consumed) {
            const item = state.items.find(i => i.id === c.itemId);
            if (item && c.actualQty > item.currentStock) {
                message.error(`Insufficient stock for ${item.name}. Available: ${item.currentStock} ${item.baseUnit}`);
                return;
            }
        }

        dispatch({ type: 'EXECUTE_RECIPE', payload: { batchId: executeModal.id, consumed } });
        setExecuteModal(null);
        executeForm.resetFields();
        message.success('Materials issued — Batch is now In-Progress');
    };

    const handleComplete = (values: Record<string, unknown>) => {
        if (!completeModal) return;
        dispatch({
            type: 'COMPLETE_BATCH',
            payload: {
                batchId: completeModal.id,
                outputQty: values.outputQty as number,
                wastageQty: values.wastageQty as number,
            },
        });
        setCompleteModal(null);
        completeForm.resetFields();
        message.success('Batch completed — Bulk stock updated!');
    };

    const statusColors: Record<string, string> = {
        Planned: '#3B82F6', 'In-Progress': '#F59E0B', Completed: '#10B981',
    };

    const columns = [
        { title: 'Batch ID', dataIndex: 'id', key: 'id', render: (t: string) => <strong>{t}</strong> },
        {
            title: 'Recipe', key: 'recipe',
            render: (_: unknown, r: ProductionBatch) => state.recipes.find(rec => rec.id === r.recipeId)?.name ?? '—',
        },
        {
            title: 'Output Product', key: 'output',
            render: (_: unknown, r: ProductionBatch) => {
                const recipe = state.recipes.find(rec => rec.id === r.recipeId);
                return state.items.find(i => i.id === recipe?.outputItemId)?.name ?? '—';
            },
        },
        {
            title: 'Status', dataIndex: 'status', key: 'status',
            render: (s: string) => <Tag color={statusColors[s]}>{s}</Tag>,
        },
        {
            title: 'Output', key: 'outputQty',
            render: (_: unknown, r: ProductionBatch) => r.status === 'Completed' ? `${r.outputQty} KG` : '—',
        },
        {
            title: 'Wastage', key: 'wastage',
            render: (_: unknown, r: ProductionBatch) => r.status === 'Completed' ? (
                <span style={{ color: 'var(--status-danger)' }}>{r.wastageQty} KG</span>
            ) : '—',
        },
        {
            title: 'Yield %', key: 'yield',
            render: (_: unknown, r: ProductionBatch) => {
                if (r.status !== 'Completed') return '—';
                const recipe = state.recipes.find(rec => rec.id === r.recipeId);
                const expected = recipe?.expectedYieldPercent ?? 100;
                const color = r.yieldPercent >= expected ? 'var(--status-success)' : 'var(--status-danger)';
                return <span style={{ color, fontWeight: 700 }}>{r.yieldPercent}%</span>;
            },
        },
        {
            title: 'Cost/KG', key: 'cost',
            render: (_: unknown, r: ProductionBatch) => r.status === 'Completed' ? `₹${r.costPerUnit}` : '—',
        },
        {
            title: 'Actions', key: 'actions',
            render: (_: unknown, r: ProductionBatch) => (
                <Space>
                    {r.status === 'Planned' && (
                        <Button size="small" type="primary" icon={<ThunderboltOutlined />} onClick={() => setExecuteModal(r)}>Issue Materials</Button>
                    )}
                    {r.status === 'In-Progress' && (
                        <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => setCompleteModal(r)} style={{ background: 'var(--status-success)' }}>Complete</Button>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <>
            <div className="content-header">
                <h2>⚙️ Production</h2>
                <div className="header-desc">Step 3 — Create batches, execute recipes, record output &amp; wastage</div>
            </div>
            <div className="content-body">
                {/* Workflow guide */}
                <Card style={{ marginBottom: 24, background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <Steps
                        size="small"
                        items={[
                            { title: 'Create Batch', description: 'Select recipe' },
                            { title: 'Issue Materials', description: 'Enter actual quantities' },
                            { title: 'Complete', description: 'Record output + wastage' },
                        ]}
                    />
                </Card>

                {/* Bulk stock quick view */}
                <div className="stat-grid">
                    {state.items.filter(i => i.type === 'BULK').map(item => (
                        <div key={item.id} className="stat-card">
                            <div className="stat-label">{item.name}</div>
                            <div className="stat-value">{item.currentStock} <span className="stat-unit">KG</span></div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                Avg Cost: ₹{item.avgCost.toFixed(2)}/KG
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>Create New Batch</Button>
                </div>

                {state.productionBatches.length === 0 ? (
                    <Empty description="No production batches yet. Start by creating your first batch!" />
                ) : (
                    <Table dataSource={state.productionBatches} columns={columns} rowKey="id" size="small" pagination={false} />
                )}
            </div>

            {/* Create Batch Modal */}
            <Modal title="Create Production Batch" open={createModal} onCancel={() => setCreateModal(false)} footer={null} destroyOnClose>
                <Form form={createForm} layout="vertical" onFinish={handleCreate}>
                    <Form.Item name="recipeId" label="Select Recipe" rules={[{ required: true }]}>
                        <Select options={state.recipes.map(r => ({ label: `${r.name} → ${state.items.find(i => i.id === r.outputItemId)?.name ?? ''}`, value: r.id }))} />
                    </Form.Item>
                    <Alert message="A batch will be created in 'Planned' status. You can then issue materials and complete it." type="info" showIcon />
                    <Form.Item style={{ marginTop: 16 }}><Button type="primary" htmlType="submit" block>Create Batch</Button></Form.Item>
                </Form>
            </Modal>

            {/* Execute / Issue Materials Modal */}
            <Modal
                title={`Issue Materials — ${executeModal?.id}`}
                open={!!executeModal}
                onCancel={() => setExecuteModal(null)}
                footer={null}
                destroyOnClose
                width={600}
            >
                {executeModal && (() => {
                    const recipe = state.recipes.find(r => r.id === executeModal.recipeId);
                    return (
                        <Form form={executeForm} layout="vertical" onFinish={handleExecute}>
                            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
                                <Descriptions.Item label="Recipe">{recipe?.name}</Descriptions.Item>
                                <Descriptions.Item label="Output">{state.items.find(i => i.id === recipe?.outputItemId)?.name}</Descriptions.Item>
                            </Descriptions>
                            <Alert message="Per FR-005: Actual quantities start BLANK. You must enter the real consumed amounts manually." type="warning" showIcon style={{ marginBottom: 16 }} />
                            <div className="section-title">Materials to Issue</div>
                            {executeModal.consumedMaterials.map(cm => {
                                const item = state.items.find(i => i.id === cm.itemId);
                                return (
                                    <div key={cm.itemId} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600 }}>{item?.name}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                Standard: {cm.standardQty} KG • Available: {item?.currentStock ?? 0} KG
                                            </div>
                                        </div>
                                        <Form.Item name={`actual_${cm.itemId}`} style={{ marginBottom: 0 }} rules={[{ required: true, message: 'Required' }]}>
                                            <InputNumber placeholder="Actual KG" min={0} style={{ width: 140 }} />
                                        </Form.Item>
                                    </div>
                                );
                            })}
                            <Form.Item style={{ marginTop: 16 }}><Button type="primary" htmlType="submit" block icon={<ThunderboltOutlined />}>Issue Materials</Button></Form.Item>
                        </Form>
                    );
                })()}
            </Modal>

            {/* Complete Batch Modal */}
            <Modal
                title={`Complete Batch — ${completeModal?.id}`}
                open={!!completeModal}
                onCancel={() => setCompleteModal(null)}
                footer={null}
                destroyOnClose
            >
                {completeModal && (() => {
                    const recipe = state.recipes.find(r => r.id === completeModal.recipeId);
                    const totalInput = completeModal.consumedMaterials.reduce((s, c) => s + c.actualQty, 0);
                    return (
                        <Form form={completeForm} layout="vertical" onFinish={handleComplete}>
                            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
                                <Descriptions.Item label="Recipe">{recipe?.name}</Descriptions.Item>
                                <Descriptions.Item label="Total Input">{totalInput} KG</Descriptions.Item>
                                <Descriptions.Item label="Expected Yield">{recipe?.expectedYieldPercent}%</Descriptions.Item>
                            </Descriptions>
                            <Form.Item name="outputQty" label="Actual Output (KG)" rules={[{ required: true }]}>
                                <InputNumber style={{ width: '100%' }} min={0} max={totalInput} />
                            </Form.Item>
                            <Form.Item name="wastageQty" label="Recorded Wastage (KG)" rules={[{ required: true }]}>
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                            <Form.Item><Button type="primary" htmlType="submit" block icon={<CheckCircleOutlined />} style={{ background: 'var(--status-success)' }}>Complete Batch</Button></Form.Item>
                        </Form>
                    );
                })()}
            </Modal>
        </>
    );
}
