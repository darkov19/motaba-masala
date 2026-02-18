import { useState } from 'react';
import { Table, Tabs, Button, Modal, Form, Select, InputNumber, Input, Tag, Space, message, Alert } from 'antd';
import { PlusOutlined, ShoppingCartOutlined, SwapOutlined } from '@ant-design/icons';
import { useDemo } from '../data/DemoContext';

export default function Procurement() {
    const { state, dispatch } = useDemo();
    const [standardModal, setStandardModal] = useState(false);
    const [bulkModal, setBulkModal] = useState(false);
    const [standardForm] = Form.useForm();
    const [bulkForm] = Form.useForm();

    const rawAndPackItems = state.items.filter(i => i.type === 'RAW' || i.type === 'PACKING');
    const bulkItems = state.items.filter(i => i.type === 'BULK');

    const handleStandardGRN = (values: Record<string, unknown>) => {
        const items = (values.items as Array<{ itemId: string; qty: number; unitPrice: number }>)?.filter(i => i?.itemId && i?.qty && i?.unitPrice) ?? [];
        if (items.length === 0) { message.error('Add at least one line item'); return; }
        dispatch({
            type: 'ADD_GRN',
            payload: { supplierId: values.supplierId as string, items, invoiceNo: (values.invoiceNo as string) || '', grnType: 'Standard' },
        });
        setStandardModal(false);
        standardForm.resetFields();
        message.success('GRN created — Stock updated!');
    };

    const handleBulkGRN = (values: Record<string, unknown>) => {
        dispatch({
            type: 'ADD_GRN',
            payload: {
                supplierId: values.supplierId as string,
                items: [{ itemId: values.itemId as string, qty: values.qty as number, unitPrice: values.unitPrice as number }],
                invoiceNo: (values.invoiceNo as string) || '',
                grnType: 'ThirdPartyBulk',
            },
        });
        setBulkModal(false);
        bulkForm.resetFields();
        message.success('Third-Party Bulk GRN created — Bulk stock updated!');
    };

    const grnColumns = [
        { title: 'GRN ID', dataIndex: 'id', key: 'id', render: (t: string) => <strong>{t}</strong> },
        {
            title: 'Type', dataIndex: 'type', key: 'type',
            render: (t: string) => <Tag color={t === 'Standard' ? '#3B82F6' : '#F59E0B'}>{t === 'Standard' ? 'Standard' : 'Third-Party'}</Tag>,
        },
        {
            title: 'Supplier', key: 'supplier',
            render: (_: unknown, r: { supplierId: string }) => state.suppliers.find(s => s.id === r.supplierId)?.name ?? '—',
        },
        { title: 'Invoice #', dataIndex: 'invoiceNo', key: 'inv' },
        {
            title: 'Items', key: 'items',
            render: (_: unknown, r: { items: Array<{ itemId: string; qty: number }> }) =>
                r.items.map(li => {
                    const item = state.items.find(i => i.id === li.itemId);
                    return `${item?.name ?? '?'} (${li.qty} ${item?.baseUnit ?? ''})`;
                }).join(', '),
        },
        { title: 'Total Value', dataIndex: 'totalValue', key: 'total', render: (v: number) => <strong>₹{v.toLocaleString()}</strong> },
        { title: 'Date', dataIndex: 'date', key: 'date', render: (d: string) => new Date(d).toLocaleDateString() },
    ];

    const tabItems = [
        {
            key: 'standard',
            label: <span><ShoppingCartOutlined /> Standard GRN</span>,
            children: (
                <div className="fade-in">
                    <Alert message="Record incoming Raw Materials and Packing Materials from suppliers." type="info" showIcon style={{ marginBottom: 16 }} />
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setStandardModal(true)}>New Standard GRN</Button>
                    </div>
                    <Table
                        dataSource={state.grnEntries.filter(g => g.type === 'Standard')}
                        columns={grnColumns}
                        rowKey="id"
                        size="small"
                        pagination={false}
                        locale={{ emptyText: 'No GRNs yet. Create your first one!' }}
                    />
                </div>
            ),
        },
        {
            key: 'thirdparty',
            label: <span><SwapOutlined /> Third-Party Bulk</span>,
            children: (
                <div className="fade-in">
                    <Alert
                        message="Third-Party Bulk Procurement"
                        description="Purchase bulk powder from external suppliers when in-house production is unavailable. This stock goes directly to Bulk inventory and is flagged as 'External' for traceability."
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setBulkModal(true)} style={{ background: '#D97706' }}>New Third-Party GRN</Button>
                    </div>
                    <Table
                        dataSource={state.grnEntries.filter(g => g.type === 'ThirdPartyBulk')}
                        columns={grnColumns}
                        rowKey="id"
                        size="small"
                        pagination={false}
                        locale={{ emptyText: 'No third-party procurements yet.' }}
                    />
                </div>
            ),
        },
    ];

    return (
        <>
            <div className="content-header">
                <h2>🛒 Procurement</h2>
                <div className="header-desc">Step 2 — Receive raw materials, packing materials, and third-party bulk</div>
            </div>
            <div className="content-body">
                {/* Stock quick view */}
                <div className="stat-grid">
                    {rawAndPackItems.slice(0, 4).map(item => (
                        <div key={item.id} className="stat-card">
                            <div className="stat-label">{item.name}</div>
                            <div className="stat-value">{item.currentStock} <span className="stat-unit">{item.baseUnit}</span></div>
                            <div style={{ fontSize: '0.7rem', color: item.currentStock <= item.reorderLevel ? 'var(--status-danger)' : 'var(--text-muted)', marginTop: 4 }}>
                                {item.currentStock <= item.reorderLevel ? '⚠ Below reorder level' : `Reorder at ${item.reorderLevel}`}
                            </div>
                        </div>
                    ))}
                </div>

                <Tabs items={tabItems} />
            </div>

            {/* Standard GRN Modal */}
            <Modal title="Create Standard GRN" open={standardModal} onCancel={() => setStandardModal(false)} footer={null} destroyOnClose width={650}>
                <Form form={standardForm} layout="vertical" onFinish={handleStandardGRN}>
                    <Space style={{ width: '100%' }} size="middle">
                        <Form.Item name="supplierId" label="Supplier" rules={[{ required: true }]} style={{ flex: 1 }}>
                            <Select options={state.suppliers.map(s => ({ label: s.name, value: s.id }))} />
                        </Form.Item>
                        <Form.Item name="invoiceNo" label="Invoice Number" style={{ flex: 1 }}><Input /></Form.Item>
                    </Space>

                    <div className="section-title">Line Items</div>
                    <Form.List name="items" initialValue={[{}]}>
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(field => (
                                    <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="start">
                                        <Form.Item name={[field.name, 'itemId']} rules={[{ required: true }]}>
                                            <Select placeholder="Select Item" style={{ width: 200 }} options={rawAndPackItems.map(i => ({ label: `${i.name} (${i.type})`, value: i.id }))} />
                                        </Form.Item>
                                        <Form.Item name={[field.name, 'qty']} rules={[{ required: true }]}>
                                            <InputNumber placeholder="Quantity" min={0.1} style={{ width: 110 }} />
                                        </Form.Item>
                                        <Form.Item name={[field.name, 'unitPrice']} rules={[{ required: true }]}>
                                            <InputNumber placeholder="₹ Price/unit" min={0.01} style={{ width: 120 }} />
                                        </Form.Item>
                                        <Button danger onClick={() => remove(field.name)} size="small">✕</Button>
                                    </Space>
                                ))}
                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Add Line Item</Button>
                            </>
                        )}
                    </Form.List>
                    <Form.Item style={{ marginTop: 16 }}><Button type="primary" htmlType="submit" block>Save GRN</Button></Form.Item>
                </Form>
            </Modal>

            {/* Third-Party Bulk Modal */}
            <Modal title="Third-Party Bulk Procurement" open={bulkModal} onCancel={() => setBulkModal(false)} footer={null} destroyOnClose>
                <Form form={bulkForm} layout="vertical" onFinish={handleBulkGRN}>
                    <Form.Item name="supplierId" label="Supplier" rules={[{ required: true }]}>
                        <Select options={state.suppliers.map(s => ({ label: s.name, value: s.id }))} />
                    </Form.Item>
                    <Form.Item name="itemId" label="Bulk Product" rules={[{ required: true }]}>
                        <Select options={bulkItems.map(i => ({ label: i.name, value: i.id }))} />
                    </Form.Item>
                    <Space style={{ width: '100%' }} size="middle">
                        <Form.Item name="qty" label="Quantity (KG)" rules={[{ required: true }]} style={{ flex: 1 }}>
                            <InputNumber style={{ width: '100%' }} min={0.1} />
                        </Form.Item>
                        <Form.Item name="unitPrice" label="Price per KG (₹)" rules={[{ required: true }]} style={{ flex: 1 }}>
                            <InputNumber style={{ width: '100%' }} min={0.01} />
                        </Form.Item>
                    </Space>
                    <Form.Item name="invoiceNo" label="Invoice Number"><Input /></Form.Item>
                    <Form.Item><Button type="primary" htmlType="submit" block style={{ background: '#D97706' }}>Save Third-Party GRN</Button></Form.Item>
                </Form>
            </Modal>
        </>
    );
}
