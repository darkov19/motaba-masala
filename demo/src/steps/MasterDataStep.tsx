import { useState } from 'react';
import { useDemoContext } from '../data/DemoContext';
import {
    Card, Table, Tag, Typography, Tabs, Descriptions, Space, Button,
    Modal, Form, Input, Select, InputNumber, message,
} from 'antd';
import {
    InboxOutlined, GiftOutlined, ShoppingOutlined,
    TeamOutlined, UserOutlined, BookOutlined,
    PlusOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

export default function MasterDataStep() {
    const { state, dispatch } = useDemoContext();
    const [activeTab, setActiveTab] = useState('items');
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
    const [itemForm] = Form.useForm();
    const [supplierForm] = Form.useForm();
    const [customerForm] = Form.useForm();
    const [recipeForm] = Form.useForm();

    const rawItems = state.items.filter(i => i.type === 'RAW');
    const packItems = state.items.filter(i => i.type === 'PACKING');
    const fgItems = state.items.filter(i => i.type === 'FINISHED_GOOD');
    const bulkItems = state.items.filter(i => i.type === 'BULK_INHOUSE');

    const typeColors: Record<string, string> = {
        RAW: '#d4380d',
        PACKING: '#d48806',
        BULK_INHOUSE: '#7c3aed',
        BULK_THIRDPARTY: '#0891b2',
        FINISHED_GOOD: '#16a34a',
    };

    const typeLabels: Record<string, string> = {
        RAW: 'Raw Material',
        PACKING: 'Packing Material',
        BULK_INHOUSE: 'Bulk (In-House)',
        BULK_THIRDPARTY: 'Bulk (3rd Party)',
        FINISHED_GOOD: 'Finished Good',
    };

    const itemColumns = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 100 },
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Type', dataIndex: 'type', key: 'type', render: (t: string) => <Tag color={typeColors[t]}>{typeLabels[t]}</Tag> },
        { title: 'Unit', dataIndex: 'unit', key: 'unit', width: 80 },
        { title: 'Cost/Unit', dataIndex: 'costPerUnit', key: 'cost', render: (v: number) => `₹${v.toLocaleString('en-IN')}`, width: 120 },
        { title: 'Pack Weight', dataIndex: 'packWeight', key: 'pw', render: (v?: number) => v ? `${v}g` : '—', width: 100 },
    ];

    const supplierColumns = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 100 },
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Type', dataIndex: 'type', key: 'type', render: (t: string) => <Tag color={t === 'raw' ? '#d4380d' : t === 'packing' ? '#d48806' : '#0891b2'}>{t.toUpperCase()}</Tag> },
        { title: 'Contact', dataIndex: 'contactPerson', key: 'contact' },
        { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    ];

    const customerColumns = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 100 },
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Channel', dataIndex: 'channel', key: 'channel', render: (c: string) => <Tag color={c === 'online' ? '#1677ff' : '#52c41a'}>{c.toUpperCase()}</Tag> },
        { title: 'Platform', dataIndex: 'platform', key: 'platform', render: (p?: string) => p || '—' },
    ];

    const handleAddItem = () => {
        itemForm.validateFields().then(values => {
            const id = `${values.type.substring(0, 2)}-${String(state.items.length + 1).padStart(3, '0')}`;
            dispatch({
                type: 'ADD_ITEM',
                item: { id, ...values, costPerUnit: values.costPerUnit || 0 },
            });
            // Also add to stock with 0 quantity
            message.success(`Item "${values.name}" added successfully!`);
            itemForm.resetFields();
            setIsItemModalOpen(false);
        });
    };

    const handleAddSupplier = () => {
        supplierForm.validateFields().then(values => {
            const id = `SUP-${String(state.suppliers.length + 1).padStart(3, '0')}`;
            dispatch({ type: 'ADD_SUPPLIER', supplier: { id, ...values } });
            message.success(`Supplier "${values.name}" added!`);
            supplierForm.resetFields();
            setIsSupplierModalOpen(false);
        });
    };

    const handleAddCustomer = () => {
        customerForm.validateFields().then(values => {
            const id = `CUST-${String(state.customers.length + 1).padStart(3, '0')}`;
            dispatch({ type: 'ADD_CUSTOMER', customer: { id, ...values } });
            message.success(`Customer "${values.name}" added!`);
            customerForm.resetFields();
            setIsCustomerModalOpen(false);
        });
    };

    const handleAddRecipe = () => {
        recipeForm.validateFields().then(values => {
            const id = `REC-${String(state.recipes.length + 1).padStart(3, '0')}`;
            const ingredients = values.ingredientIds.map((iid: string) => {
                const item = state.items.find(i => i.id === iid);
                return { itemId: iid, itemName: item?.name || iid, unit: item?.unit || 'KG' };
            });
            const outputItem = state.items.find(i => i.id === values.outputItemId);
            dispatch({
                type: 'ADD_RECIPE',
                recipe: {
                    id,
                    outputItemId: values.outputItemId,
                    outputItemName: outputItem?.name || values.outputItemId,
                    expectedYieldPercent: values.expectedYieldPercent,
                    ingredients,
                },
            });
            message.success(`Recipe "${outputItem?.name}" added!`);
            recipeForm.resetFields();
            setIsRecipeModalOpen(false);
        });
    };

    const tabItems = [
        {
            key: 'items',
            label: (
                <span><InboxOutlined /> Items ({state.items.length})</span>
            ),
            children: (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <Space>
                            <Tag color="#d4380d">Raw: {rawItems.length}</Tag>
                            <Tag color="#d48806">Packing: {packItems.length}</Tag>
                            <Tag color="#7c3aed">Bulk: {bulkItems.length}</Tag>
                            <Tag color="#16a34a">FG: {fgItems.length}</Tag>
                        </Space>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsItemModalOpen(true)}>Add Item</Button>
                    </div>
                    <Table
                        dataSource={state.items}
                        columns={itemColumns}
                        rowKey="id"
                        size="small"
                        pagination={{ pageSize: 8 }}
                        style={{ fontSize: 13 }}
                    />
                </div>
            ),
        },
        {
            key: 'suppliers',
            label: (
                <span><TeamOutlined /> Suppliers ({state.suppliers.length})</span>
            ),
            children: (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsSupplierModalOpen(true)}>Add Supplier</Button>
                    </div>
                    <Table dataSource={state.suppliers} columns={supplierColumns} rowKey="id" size="small" pagination={false} />
                </div>
            ),
        },
        {
            key: 'customers',
            label: (
                <span><UserOutlined /> Customers ({state.customers.length})</span>
            ),
            children: (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCustomerModalOpen(true)}>Add Customer</Button>
                    </div>
                    <Table dataSource={state.customers} columns={customerColumns} rowKey="id" size="small" pagination={false} />
                </div>
            ),
        },
        {
            key: 'recipes',
            label: (
                <span><BookOutlined /> Recipes ({state.recipes.length})</span>
            ),
            children: (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsRecipeModalOpen(true)}>Add Recipe</Button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                        {state.recipes.map(recipe => (
                            <Card key={recipe.id} size="small" title={recipe.outputItemName}
                                extra={<Tag color="purple">Yield: {recipe.expectedYieldPercent}%</Tag>}
                            >
                                <Descriptions size="small" column={1}>
                                    <Descriptions.Item label="Recipe ID">{recipe.id}</Descriptions.Item>
                                    <Descriptions.Item label="Ingredients">
                                        {recipe.ingredients.map(ing => (
                                            <Tag key={ing.itemId} style={{ marginBottom: 4 }}>{ing.itemName}</Tag>
                                        ))}
                                    </Descriptions.Item>
                                </Descriptions>
                            </Card>
                        ))}
                    </div>
                </div>
            ),
        },
    ];

    return (
        <div className="step-content">
            <div className="step-header">
                <Title level={3} style={{ margin: 0 }}>
                    <InboxOutlined style={{ marginRight: 8, color: '#7D1111' }} />
                    Master Data Management
                </Title>
                <Text type="secondary">
                    Define items, suppliers, customers, and production recipes
                </Text>
            </div>

            <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

            {/* Add Item Modal */}
            <Modal title="Add New Item" open={isItemModalOpen} onOk={handleAddItem} onCancel={() => setIsItemModalOpen(false)} okText="Add Item">
                <Form form={itemForm} layout="vertical">
                    <Form.Item name="name" label="Item Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Mustard Seeds" />
                    </Form.Item>
                    <Form.Item name="type" label="Item Type" rules={[{ required: true }]}>
                        <Select options={[
                            { value: 'RAW', label: 'Raw Material' },
                            { value: 'PACKING', label: 'Packing Material' },
                            { value: 'BULK_INHOUSE', label: 'Bulk (In-House)' },
                            { value: 'FINISHED_GOOD', label: 'Finished Good' },
                        ]} />
                    </Form.Item>
                    <Form.Item name="unit" label="Unit" rules={[{ required: true }]}>
                        <Select options={[
                            { value: 'KG', label: 'KG' },
                            { value: 'PCS', label: 'PCS' },
                            { value: 'ROLL', label: 'ROLL' },
                        ]} />
                    </Form.Item>
                    <Form.Item name="costPerUnit" label="Cost per Unit (₹)">
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                    <Form.Item name="packWeight" label="Pack Weight (grams) — for Finished Goods only">
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Add Supplier Modal */}
            <Modal title="Add New Supplier" open={isSupplierModalOpen} onOk={handleAddSupplier} onCancel={() => setIsSupplierModalOpen(false)} okText="Add">
                <Form form={supplierForm} layout="vertical">
                    <Form.Item name="name" label="Supplier Name" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                        <Select options={[
                            { value: 'raw', label: 'Raw Material' },
                            { value: 'packing', label: 'Packing Material' },
                            { value: 'bulk', label: 'Bulk Supplier' },
                        ]} />
                    </Form.Item>
                    <Form.Item name="contactPerson" label="Contact Person" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="phone" label="Phone" rules={[{ required: true }]}><Input /></Form.Item>
                </Form>
            </Modal>

            {/* Add Customer Modal */}
            <Modal title="Add New Customer" open={isCustomerModalOpen} onOk={handleAddCustomer} onCancel={() => setIsCustomerModalOpen(false)} okText="Add">
                <Form form={customerForm} layout="vertical">
                    <Form.Item name="name" label="Customer Name" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="channel" label="Channel" rules={[{ required: true }]}>
                        <Select options={[{ value: 'local', label: 'Local' }, { value: 'online', label: 'Online' }]} />
                    </Form.Item>
                    <Form.Item name="platform" label="Platform (if online)"><Input placeholder="e.g. Flipkart" /></Form.Item>
                </Form>
            </Modal>

            {/* Add Recipe Modal */}
            <Modal title="Add New Recipe" open={isRecipeModalOpen} onOk={handleAddRecipe} onCancel={() => setIsRecipeModalOpen(false)} okText="Add Recipe" width={600}>
                <Form form={recipeForm} layout="vertical">
                    <Form.Item name="outputItemId" label="Output Bulk Item" rules={[{ required: true }]}>
                        <Select
                            options={bulkItems.map(i => ({ value: i.id, label: i.name }))}
                            placeholder="Select the bulk item this recipe produces"
                        />
                    </Form.Item>
                    <Form.Item name="expectedYieldPercent" label="Expected Yield %" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={1} max={100} placeholder="e.g. 97" />
                    </Form.Item>
                    <Form.Item name="ingredientIds" label="Ingredients (Raw Materials)" rules={[{ required: true }]}>
                        <Select
                            mode="multiple"
                            options={rawItems.map(i => ({ value: i.id, label: i.name }))}
                            placeholder="Select raw materials used in this recipe"
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
