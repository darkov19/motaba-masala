import { useState } from 'react';
import { Table, Button, Modal, Form, Select, InputNumber, Tag, Space, message, Alert, Empty, Descriptions } from 'antd';
import { PlusOutlined, CarOutlined } from '@ant-design/icons';
import { useDemo } from '../data/DemoContext';
import type { DispatchLineItem } from '../types';

export default function Dispatch() {
    const { state, dispatch } = useDemo();
    const [dispatchModal, setDispatchModal] = useState(false);
    const [form] = Form.useForm();

    const fgItems = state.items.filter(i => i.type === 'FG' && i.currentStock > 0);
    const allFgItems = state.items.filter(i => i.type === 'FG');

    const handleDispatch = (values: Record<string, unknown>) => {
        const items: DispatchLineItem[] = (values.items as Array<{ itemId: string; qty: number; unitPrice: number }>)
            ?.filter(i => i?.itemId && i?.qty && i?.unitPrice) ?? [];
        if (items.length === 0) { message.error('Add at least one item'); return; }

        // Validate stock
        for (const li of items) {
            const item = state.items.find(i => i.id === li.itemId);
            if (item && li.qty > item.currentStock) {
                message.error(`Insufficient stock for ${item.name}. Available: ${item.currentStock}`);
                return;
            }
        }

        dispatch({
            type: 'CREATE_DISPATCH',
            payload: { customerId: values.customerId as string, items },
        });
        setDispatchModal(false);
        form.resetFields();
        message.success('Dispatch completed — FG stock deducted!');
    };

    const columns = [
        { title: 'Dispatch ID', dataIndex: 'id', key: 'id', render: (t: string) => <strong>{t}</strong> },
        {
            title: 'Customer', key: 'customer',
            render: (_: unknown, r: { customerId: string }) => state.customers.find(c => c.id === r.customerId)?.name ?? '—',
        },
        {
            title: 'Channel', key: 'channel',
            render: (_: unknown, r: { customerId: string }) => {
                const cust = state.customers.find(c => c.id === r.customerId);
                return cust ? <Tag>{cust.channel}</Tag> : '—';
            },
        },
        {
            title: 'Items', key: 'items',
            render: (_: unknown, r: { items: DispatchLineItem[] }) =>
                r.items.map(li => {
                    const item = state.items.find(i => i.id === li.itemId);
                    return `${item?.name ?? '?'} × ${li.qty}`;
                }).join(', '),
        },
        {
            title: 'Total Value', dataIndex: 'totalValue', key: 'total',
            render: (v: number) => <strong style={{ color: 'var(--status-success)' }}>₹{v.toLocaleString()}</strong>,
        },
        {
            title: 'Status', dataIndex: 'status', key: 'status',
            render: (s: string) => <Tag color="#10B981">{s}</Tag>,
        },
        {
            title: 'Date', dataIndex: 'date', key: 'date',
            render: (d: string) => new Date(d).toLocaleDateString(),
        },
    ];

    // Invoice card for last dispatch
    const lastDispatch = state.dispatches[state.dispatches.length - 1];

    return (
        <>
            <div className="content-header">
                <h2>🚚 Dispatch</h2>
                <div className="header-desc">Step 5 — Ship finished goods to customers (FIFO recommended)</div>
            </div>
            <div className="content-body">
                {/* FG availability */}
                <div className="stat-grid">
                    {allFgItems.map(item => (
                        <div key={item.id} className="stat-card">
                            <div className="stat-label">{item.name}</div>
                            <div className="stat-value">{item.currentStock} <span className="stat-unit">PCS</span></div>
                            <div className={`stock-badge ${item.currentStock > item.reorderLevel ? 'ok' : item.currentStock > 0 ? 'low' : 'critical'}`} style={{ marginTop: 8 }}>
                                {item.currentStock > item.reorderLevel ? '✓ In Stock' : item.currentStock > 0 ? '⚠ Low Stock' : '✕ Out of Stock'}
                            </div>
                        </div>
                    ))}
                </div>

                <Alert
                    message="FIFO Dispatch Policy"
                    description="Per FR-013: The system recommends dispatching oldest batches first (FIFO). In the full system, batch selection will be automated."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setDispatchModal(true)}>Create Dispatch Note</Button>
                </div>

                {state.dispatches.length === 0 ? (
                    <Empty description="No dispatches yet. Pack some finished goods first!" />
                ) : (
                    <Table dataSource={state.dispatches} columns={columns} rowKey="id" size="small" pagination={false} />
                )}

                {/* Invoice Summary for last dispatch */}
                {lastDispatch && (
                    <div style={{ marginTop: 24 }}>
                        <div className="section-title">📄 Latest Invoice Summary</div>
                        <div className="stat-card" style={{ maxWidth: 600 }}>
                            <Descriptions bordered size="small" column={1}>
                                <Descriptions.Item label="Dispatch ID">{lastDispatch.id}</Descriptions.Item>
                                <Descriptions.Item label="Customer">{state.customers.find(c => c.id === lastDispatch.customerId)?.name}</Descriptions.Item>
                                <Descriptions.Item label="Date">{new Date(lastDispatch.date).toLocaleDateString()}</Descriptions.Item>
                                <Descriptions.Item label="Items">
                                    {lastDispatch.items.map(li => {
                                        const item = state.items.find(i => i.id === li.itemId);
                                        return <div key={li.itemId}>{item?.name} × {li.qty} @ ₹{li.unitPrice} = ₹{(li.qty * li.unitPrice).toLocaleString()}</div>;
                                    })}
                                </Descriptions.Item>
                                <Descriptions.Item label="Total Value">
                                    <strong style={{ fontSize: '1.1rem', color: 'var(--status-success)' }}>₹{lastDispatch.totalValue.toLocaleString()}</strong>
                                </Descriptions.Item>
                            </Descriptions>
                        </div>
                    </div>
                )}
            </div>

            {/* Dispatch Modal */}
            <Modal title="Create Dispatch Note" open={dispatchModal} onCancel={() => setDispatchModal(false)} footer={null} destroyOnClose width={650}>
                <Alert message="Only Finished Goods can be dispatched (per FR-012). Bulk Powder cannot be added to dispatch." type="warning" showIcon style={{ marginBottom: 16 }} />
                <Form form={form} layout="vertical" onFinish={handleDispatch}>
                    <Form.Item name="customerId" label="Customer" rules={[{ required: true }]}>
                        <Select options={state.customers.map(c => ({ label: `${c.name} (${c.channel})`, value: c.id }))} />
                    </Form.Item>

                    <div className="section-title">Dispatch Items</div>
                    <Form.List name="items" initialValue={[{}]}>
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(field => (
                                    <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="start">
                                        <Form.Item name={[field.name, 'itemId']} rules={[{ required: true }]}>
                                            <Select placeholder="Finished Good" style={{ width: 200 }} options={fgItems.map(i => ({ label: `${i.name} (${i.currentStock} avail)`, value: i.id }))} />
                                        </Form.Item>
                                        <Form.Item name={[field.name, 'qty']} rules={[{ required: true }]}>
                                            <InputNumber placeholder="Qty" min={1} style={{ width: 100 }} />
                                        </Form.Item>
                                        <Form.Item name={[field.name, 'unitPrice']} rules={[{ required: true }]}>
                                            <InputNumber placeholder="₹ Sell Price" min={0.01} style={{ width: 130 }} />
                                        </Form.Item>
                                        <Button danger onClick={() => remove(field.name)} size="small">✕</Button>
                                    </Space>
                                ))}
                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Add Item</Button>
                            </>
                        )}
                    </Form.List>

                    <Form.Item style={{ marginTop: 16 }}>
                        <Button type="primary" htmlType="submit" block icon={<CarOutlined />}>Confirm Dispatch</Button>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}
