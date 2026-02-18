import { useState } from 'react';
import { useDemoContext } from '../data/DemoContext';
import { Card, Form, Select, InputNumber, Button, Typography, Tag, Divider, message, Table, Space, Descriptions } from 'antd';
import { SendOutlined, CheckCircleOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function DispatchStep() {
    const { state, dispatch } = useDemoContext();
    const [form] = Form.useForm();
    const [orderItems, setOrderItems] = useState<{ itemId: string; itemName: string; quantity: number; unit: string }[]>([]);
    const [selectedFGId, setSelectedFGId] = useState('');
    const [fgQty, setFgQty] = useState(0);

    const fgStock = state.stock.filter(s => s.type === 'FINISHED_GOOD' && s.quantity > 0);

    const addItem = () => {
        if (!selectedFGId || fgQty <= 0) return;
        const item = state.items.find(i => i.id === selectedFGId);
        if (!item) return;
        setOrderItems(prev => [...prev, { itemId: item.id, itemName: item.name, quantity: fgQty, unit: 'PCS' }]);
        setSelectedFGId(''); setFgQty(0);
    };

    const handleSubmit = () => {
        form.validateFields().then(values => {
            if (orderItems.length === 0) { message.error('Add items'); return; }
            const cust = state.customers.find(c => c.id === values.customerId);
            const order = {
                id: `DISP-${String(state.dispatchOrders.length + 1).padStart(3, '0')}`,
                date: dayjs().format('YYYY-MM-DD'),
                customerId: values.customerId,
                customerName: cust?.name || '',
                channel: cust?.channel || 'local',
                items: orderItems,
            };
            dispatch({ type: 'ADD_DISPATCH', order });
            dispatch({ type: 'ADD_NOTIFICATION', notification: { id: Date.now().toString(), message: `Dispatched ${orderItems.reduce((s, i) => s + i.quantity, 0)} units to ${cust?.name}`, type: 'success' } });
            message.success('Dispatch recorded!');
            form.resetFields(); setOrderItems([]);
        });
    };

    return (
        <div className="step-content">
            <div className="step-header">
                <Title level={3} style={{ margin: 0 }}><SendOutlined style={{ marginRight: 8, color: '#7D1111' }} />Sales & Dispatch</Title>
                <Text type="secondary">Dispatch finished goods to customers and online channels</Text>
            </div>
            <div style={{ marginBottom: 16 }}>
                <Text strong>Available Finished Goods:</Text>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {fgStock.length > 0 ? fgStock.map(s => (
                        <Tag key={s.itemId} color="green">{s.itemName}: {s.quantity} PCS</Tag>
                    )) : <Text type="secondary" italic>No finished goods. Complete packing first.</Text>}
                </div>
            </div>
            <Card title="New Dispatch Order">
                <Form form={form} layout="vertical">
                    <Form.Item name="customerId" label="Customer / Channel" rules={[{ required: true }]}>
                        <Select placeholder="Select customer" options={state.customers.map(c => ({
                            value: c.id, label: `${c.name} ${c.channel === 'online' ? `(${c.platform})` : '(Local)'}`,
                        }))} />
                    </Form.Item>
                </Form>
                <Divider>Add Items</Divider>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 12, alignItems: 'end', marginBottom: 12 }}>
                    <Select value={selectedFGId || undefined} onChange={setSelectedFGId} placeholder="Select product"
                        options={fgStock.map(s => ({ value: s.itemId, label: `${s.itemName} (${s.quantity} available)` }))} />
                    <InputNumber value={fgQty || undefined} onChange={v => setFgQty(v || 0)} min={0} placeholder="Qty" style={{ width: '100%' }} />
                    <Button icon={<PlusOutlined />} onClick={addItem}>Add</Button>
                </div>
                {orderItems.length > 0 && (
                    <>
                        <Table dataSource={orderItems} rowKey={(_, i) => String(i)} size="small" pagination={false} columns={[
                            { title: 'Product', dataIndex: 'itemName' },
                            { title: 'Qty', dataIndex: 'quantity', render: (v: number) => `${v} PCS` },
                            { title: '', key: 'del', width: 50, render: (_, __, idx) => <Button danger size="small" icon={<DeleteOutlined />} onClick={() => setOrderItems(p => p.filter((_, i) => i !== idx))} /> },
                        ]} />
                        <div style={{ textAlign: 'right', marginTop: 16 }}>
                            <Space>
                                <Tag color="blue">{orderItems.length} products, {orderItems.reduce((s, i) => s + i.quantity, 0)} total units</Tag>
                                <Button type="primary" size="large" icon={<CheckCircleOutlined />} onClick={handleSubmit}
                                    style={{ background: '#16a34a', borderColor: '#16a34a' }}>Submit Dispatch</Button>
                            </Space>
                        </div>
                    </>
                )}
            </Card>
            {state.dispatchOrders.length > 0 && (<>
                <Divider>Dispatch History</Divider>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                    {state.dispatchOrders.map(order => (
                        <Card key={order.id} size="small" title={<><SendOutlined /> {order.id}</>}
                            extra={<Tag color={order.channel === 'online' ? 'blue' : 'green'}>{order.channel}</Tag>}>
                            <Descriptions size="small" column={1}>
                                <Descriptions.Item label="Customer">{order.customerName}</Descriptions.Item>
                                <Descriptions.Item label="Date">{order.date}</Descriptions.Item>
                                <Descriptions.Item label="Items">
                                    {order.items.map((it, idx) => <Tag key={idx}>{it.itemName} × {it.quantity}</Tag>)}
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>
                    ))}
                </div>
            </>)}
        </div>
    );
}
