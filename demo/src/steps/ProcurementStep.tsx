import { useState } from 'react';
import { useDemoContext } from '../data/DemoContext';
import {
    Card, Form, Select, InputNumber, Button, Table, Typography,
    DatePicker, Space, Tag, Divider, message, Segmented, Alert,
} from 'antd';
import {
    ShoppingCartOutlined, PlusOutlined, DeleteOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function ProcurementStep() {
    const { state, dispatch } = useDemoContext();
    const [form] = Form.useForm();
    const [purchaseType, setPurchaseType] = useState<'raw' | 'packing' | 'thirdparty'>('raw');
    const [grnItems, setGrnItems] = useState<
        { itemId: string; itemName: string; quantity: number; unit: string; ratePerUnit: number; totalValue: number }[]
    >([]);
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [qty, setQty] = useState<number>(0);
    const [rate, setRate] = useState<number>(0);

    const availableItems = purchaseType === 'raw'
        ? state.items.filter(i => i.type === 'RAW')
        : purchaseType === 'packing'
            ? state.items.filter(i => i.type === 'PACKING')
            : state.items.filter(i => i.type === 'BULK_INHOUSE'); // For third-party, they buy bulk items

    const availableSuppliers = purchaseType === 'thirdparty'
        ? state.suppliers.filter(s => s.type === 'bulk')
        : state.suppliers.filter(s => s.type === purchaseType);

    const handleAddLine = () => {
        if (!selectedItemId || qty <= 0 || rate <= 0) {
            message.warning('Please select an item and enter valid quantity and rate');
            return;
        }
        const item = state.items.find(i => i.id === selectedItemId);
        if (!item) return;
        setGrnItems(prev => [...prev, {
            itemId: item.id,
            itemName: item.name,
            quantity: qty,
            unit: item.unit,
            ratePerUnit: rate,
            totalValue: qty * rate,
        }]);
        setSelectedItemId('');
        setQty(0);
        setRate(0);
    };

    const handleSubmitGRN = () => {
        form.validateFields().then(values => {
            if (grnItems.length === 0) {
                message.error('Please add at least one item to the GRN');
                return;
            }
            const grn = {
                id: `GRN-${String(state.grnEntries.length + 1).padStart(3, '0')}`,
                date: values.date ? values.date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
                supplierId: values.supplierId,
                supplierName: state.suppliers.find(s => s.id === values.supplierId)?.name || '',
                items: grnItems,
            };

            if (purchaseType === 'thirdparty') {
                dispatch({ type: 'ADD_THIRD_PARTY_BULK', grn });
            } else {
                dispatch({ type: 'ADD_GRN', grn });
            }

            dispatch({
                type: 'ADD_NOTIFICATION',
                notification: {
                    id: Date.now().toString(),
                    message: `GRN ${grn.id} recorded: ${grnItems.length} items worth ₹${grnItems.reduce((s, i) => s + i.totalValue, 0).toLocaleString('en-IN')}`,
                    type: 'success',
                },
            });

            message.success(`GRN ${grn.id} recorded successfully!`);
            form.resetFields();
            setGrnItems([]);
        });
    };

    const totalValue = grnItems.reduce((sum, i) => sum + i.totalValue, 0);

    return (
        <div className="step-content">
            <div className="step-header">
                <Title level={3} style={{ margin: 0 }}>
                    <ShoppingCartOutlined style={{ marginRight: 8, color: '#7D1111' }} />
                    Procurement — Goods Received Note (GRN)
                </Title>
                <Text type="secondary">
                    Record incoming raw materials, packing materials, or third-party bulk purchases
                </Text>
            </div>

            <Segmented
                value={purchaseType}
                onChange={(v) => { setPurchaseType(v as 'raw' | 'packing' | 'thirdparty'); setGrnItems([]); }}
                options={[
                    { value: 'raw', label: '🌶️ Raw Materials' },
                    { value: 'packing', label: '📦 Packing Materials' },
                    { value: 'thirdparty', label: '🔄 Third-Party Bulk' },
                ]}
                style={{ marginBottom: 20 }}
                block
            />

            {purchaseType === 'thirdparty' && (
                <Alert
                    message="Third-Party Bulk Procurement"
                    description="This is for procuring bulk masala from external suppliers as backup when in-house production is short. The bulk will be stored separately and can be repacked into your own branded packaging."
                    type="info"
                    showIcon
                    style={{ marginBottom: 20 }}
                />
            )}

            <Card>
                <Form form={form} layout="vertical">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="supplierId" label="Supplier" rules={[{ required: true }]}>
                            <Select
                                placeholder="Select supplier"
                                options={availableSuppliers.map(s => ({ value: s.id, label: `${s.name} (${s.contactPerson})` }))}
                            />
                        </Form.Item>
                        <Form.Item name="date" label="GRN Date" rules={[{ required: true }]}>
                            <DatePicker style={{ width: '100%' }} defaultValue={dayjs()} />
                        </Form.Item>
                    </div>
                </Form>

                <Divider>Add Items to GRN</Divider>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'end', marginBottom: 16 }}>
                    <div>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Item</Text>
                        <Select
                            value={selectedItemId || undefined}
                            onChange={setSelectedItemId}
                            placeholder="Select item"
                            options={availableItems.map(i => ({ value: i.id, label: `${i.name} (${i.unit})` }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Quantity</Text>
                        <InputNumber value={qty} onChange={(v) => setQty(v || 0)} min={0} style={{ width: '100%' }} placeholder="Qty" />
                    </div>
                    <div>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Rate (₹/unit)</Text>
                        <InputNumber value={rate} onChange={(v) => setRate(v || 0)} min={0} style={{ width: '100%' }} placeholder="Rate" />
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddLine} style={{ marginBottom: 0 }}>
                        Add
                    </Button>
                </div>

                {grnItems.length > 0 && (
                    <>
                        <Table
                            dataSource={grnItems}
                            rowKey={(_, i) => String(i)}
                            size="small"
                            pagination={false}
                            columns={[
                                { title: 'Item', dataIndex: 'itemName', key: 'name' },
                                { title: 'Qty', dataIndex: 'quantity', key: 'qty', render: (v: number, r) => `${v} ${r.unit}` },
                                { title: 'Rate', dataIndex: 'ratePerUnit', key: 'rate', render: (v: number) => `₹${v.toLocaleString('en-IN')}` },
                                { title: 'Total', dataIndex: 'totalValue', key: 'total', render: (v: number) => <Text strong>₹{v.toLocaleString('en-IN')}</Text> },
                                {
                                    title: '', key: 'action', width: 50,
                                    render: (_: unknown, __: unknown, idx: number) => (
                                        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => setGrnItems(prev => prev.filter((_, i) => i !== idx))} />
                                    ),
                                },
                            ]}
                        />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '12px 16px', background: '#fafafa', borderRadius: 8 }}>
                            <Space>
                                <Tag color="blue">{grnItems.length} items</Tag>
                                <Text strong style={{ fontSize: 16 }}>Total: ₹{totalValue.toLocaleString('en-IN')}</Text>
                            </Space>
                            <Button
                                type="primary"
                                size="large"
                                icon={<CheckCircleOutlined />}
                                onClick={handleSubmitGRN}
                                style={{ background: '#16a34a', borderColor: '#16a34a' }}
                            >
                                Submit GRN
                            </Button>
                        </div>
                    </>
                )}
            </Card>

            {/* GRN History */}
            {state.grnEntries.length > 0 && (
                <>
                    <Divider>GRN History</Divider>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                        {state.grnEntries.map(grn => (
                            <Card key={grn.id} size="small" title={grn.id}
                                extra={<Tag color="green">{grn.date}</Tag>}
                            >
                                <Text type="secondary">{grn.supplierName}</Text>
                                <div style={{ marginTop: 8 }}>
                                    {grn.items.map((item, idx) => (
                                        <div key={idx} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{item.itemName}</span>
                                            <span>{item.quantity} {item.unit} @ ₹{item.ratePerUnit}</span>
                                        </div>
                                    ))}
                                </div>
                                <Divider style={{ margin: '8px 0' }} />
                                <Text strong>Total: ₹{grn.items.reduce((s, i) => s + i.totalValue, 0).toLocaleString('en-IN')}</Text>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
