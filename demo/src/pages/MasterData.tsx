import { useState } from 'react';
import { Table, Tabs, Button, Modal, Form, Input, InputNumber, Select, Tag, Space, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useDemo } from '../data/DemoContext';
import type { ItemType, ItemUnit } from '../types';

const itemTypeColors: Record<ItemType, string> = {
    RAW: '#3B82F6', BULK: '#F59E0B', PACKING: '#8B5CF6', FG: '#10B981',
};
const itemTypeLabels: Record<ItemType, string> = {
    RAW: 'Raw Material', BULK: 'Bulk Powder', PACKING: 'Packing Material', FG: 'Finished Good',
};

export default function MasterData() {
    const { state, dispatch } = useDemo();
    const [itemModal, setItemModal] = useState(false);
    const [recipeModal, setRecipeModal] = useState(false);
    const [supplierModal, setSupplierModal] = useState(false);
    const [customerModal, setCustomerModal] = useState(false);
    const [itemForm] = Form.useForm();
    const [recipeForm] = Form.useForm();
    const [supplierForm] = Form.useForm();
    const [customerForm] = Form.useForm();

    const handleAddItem = (values: Record<string, unknown>) => {
        dispatch({
            type: 'ADD_ITEM',
            payload: {
                id: `item-${Date.now()}`,
                name: values.name as string,
                type: values.type as ItemType,
                baseUnit: values.baseUnit as ItemUnit,
                avgCost: (values.avgCost as number) || 0,
                currentStock: 0,
                reorderLevel: (values.reorderLevel as number) || 0,
                packWeight: values.type === 'FG' ? (values.packWeight as number) : undefined,
            },
        });
        setItemModal(false);
        itemForm.resetFields();
        message.success('Item added successfully');
    };

    const handleAddRecipe = (values: Record<string, unknown>) => {
        const ingredients = (values.ingredients as Array<{ itemId: string; standardQty: number }>)?.filter(i => i?.itemId && i?.standardQty) ?? [];
        if (ingredients.length === 0) { message.error('Add at least one ingredient'); return; }
        dispatch({
            type: 'ADD_RECIPE',
            payload: {
                id: `recipe-${Date.now()}`,
                name: values.name as string,
                outputItemId: values.outputItemId as string,
                ingredients,
                expectedYieldPercent: (values.expectedYieldPercent as number) || 95,
                expectedWastagePercent: (values.expectedWastagePercent as number) || 5,
            },
        });
        setRecipeModal(false);
        recipeForm.resetFields();
        message.success('Recipe added successfully');
    };

    const handleAddSupplier = (values: Record<string, unknown>) => {
        dispatch({
            type: 'ADD_SUPPLIER',
            payload: { id: `sup-${Date.now()}`, name: values.name as string, contact: values.contact as string, leadTimeDays: (values.leadTimeDays as number) || 3 },
        });
        setSupplierModal(false);
        supplierForm.resetFields();
        message.success('Supplier added');
    };

    const handleAddCustomer = (values: Record<string, unknown>) => {
        dispatch({
            type: 'ADD_CUSTOMER',
            payload: { id: `cust-${Date.now()}`, name: values.name as string, contact: values.contact as string, channel: values.channel as string },
        });
        setCustomerModal(false);
        customerForm.resetFields();
        message.success('Customer added');
    };

    const itemColumns = [
        { title: 'Name', dataIndex: 'name', key: 'name', render: (t: string) => <strong>{t}</strong> },
        { title: 'Type', dataIndex: 'type', key: 'type', render: (t: ItemType) => <Tag color={itemTypeColors[t]}>{itemTypeLabels[t]}</Tag> },
        { title: 'Unit', dataIndex: 'baseUnit', key: 'baseUnit' },
        { title: 'Stock', dataIndex: 'currentStock', key: 'currentStock', render: (v: number, r: { baseUnit: string }) => `${v} ${r.baseUnit}` },
        { title: 'Avg Cost (₹)', dataIndex: 'avgCost', key: 'avgCost', render: (v: number) => `₹${v.toFixed(2)}` },
        { title: 'Reorder Level', dataIndex: 'reorderLevel', key: 'reorderLevel' },
    ];

    const recipeColumns = [
        { title: 'Recipe Name', dataIndex: 'name', key: 'name', render: (t: string) => <strong>{t}</strong> },
        { title: 'Output Product', key: 'output', render: (_: unknown, r: { outputItemId: string }) => state.items.find(i => i.id === r.outputItemId)?.name ?? '—' },
        {
            title: 'Ingredients', key: 'ingredients', render: (_: unknown, r: { ingredients: Array<{ itemId: string; standardQty: number }> }) =>
                r.ingredients.map(ing => {
                    const item = state.items.find(i => i.id === ing.itemId);
                    return `${item?.name ?? '?'} (${ing.standardQty}kg)`;
                }).join(', ')
        },
        { title: 'Expected Yield', dataIndex: 'expectedYieldPercent', key: 'yield', render: (v: number) => `${v}%` },
    ];

    const supplierColumns = [
        { title: 'Name', dataIndex: 'name', key: 'name', render: (t: string) => <strong>{t}</strong> },
        { title: 'Contact', dataIndex: 'contact', key: 'contact' },
        { title: 'Lead Time', dataIndex: 'leadTimeDays', key: 'lead', render: (v: number) => `${v} days` },
    ];

    const customerColumns = [
        { title: 'Name', dataIndex: 'name', key: 'name', render: (t: string) => <strong>{t}</strong> },
        { title: 'Contact', dataIndex: 'contact', key: 'contact' },
        { title: 'Channel', dataIndex: 'channel', key: 'channel', render: (v: string) => <Tag>{v}</Tag> },
    ];

    const rawItems = state.items.filter(i => i.type === 'RAW');

    const tabItems = [
        {
            key: 'items',
            label: `Items (${state.items.length})`,
            children: (
                <div className="fade-in">
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setItemModal(true)}>Add Item</Button>
                    </div>
                    <Table dataSource={state.items} columns={itemColumns} rowKey="id" size="small" pagination={false} />
                </div>
            ),
        },
        {
            key: 'recipes',
            label: `Recipes (${state.recipes.length})`,
            children: (
                <div className="fade-in">
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setRecipeModal(true)}>Add Recipe</Button>
                    </div>
                    <Table dataSource={state.recipes} columns={recipeColumns} rowKey="id" size="small" pagination={false} />
                </div>
            ),
        },
        {
            key: 'suppliers',
            label: `Suppliers (${state.suppliers.length})`,
            children: (
                <div className="fade-in">
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setSupplierModal(true)}>Add Supplier</Button>
                    </div>
                    <Table dataSource={state.suppliers} columns={supplierColumns} rowKey="id" size="small" pagination={false} />
                </div>
            ),
        },
        {
            key: 'customers',
            label: `Customers (${state.customers.length})`,
            children: (
                <div className="fade-in">
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCustomerModal(true)}>Add Customer</Button>
                    </div>
                    <Table dataSource={state.customers} columns={customerColumns} rowKey="id" size="small" pagination={false} />
                </div>
            ),
        },
    ];

    return (
        <>
            <div className="content-header">
                <h2>📋 Master Data</h2>
                <div className="header-desc">Step 1 — Setup items, recipes, suppliers, and customers</div>
            </div>
            <div className="content-body">
                <Tabs items={tabItems} />
            </div>

            {/* Add Item Modal */}
            <Modal title="Add New Item" open={itemModal} onCancel={() => setItemModal(false)} footer={null} destroyOnClose>
                <Form form={itemForm} layout="vertical" onFinish={handleAddItem}>
                    <Form.Item name="name" label="Item Name" rules={[{ required: true }]}><Input /></Form.Item>
                    <Space style={{ width: '100%' }} size="middle">
                        <Form.Item name="type" label="Type" rules={[{ required: true }]} style={{ flex: 1 }}>
                            <Select options={[
                                { label: 'Raw Material', value: 'RAW' },
                                { label: 'Bulk Powder', value: 'BULK' },
                                { label: 'Packing Material', value: 'PACKING' },
                                { label: 'Finished Good', value: 'FG' },
                            ]} />
                        </Form.Item>
                        <Form.Item name="baseUnit" label="Unit" rules={[{ required: true }]} style={{ flex: 1 }}>
                            <Select options={[
                                { label: 'KG', value: 'KG' }, { label: 'Grams', value: 'G' },
                                { label: 'Pieces', value: 'PCS' }, { label: 'Box', value: 'BOX' },
                            ]} />
                        </Form.Item>
                    </Space>
                    <Space style={{ width: '100%' }} size="middle">
                        <Form.Item name="avgCost" label="Initial Cost (₹)" style={{ flex: 1 }}>
                            <InputNumber style={{ width: '100%' }} min={0} />
                        </Form.Item>
                        <Form.Item name="reorderLevel" label="Reorder Level" style={{ flex: 1 }}>
                            <InputNumber style={{ width: '100%' }} min={0} />
                        </Form.Item>
                    </Space>
                    <Form.Item noStyle shouldUpdate={(prev, cur) => prev.type !== cur.type}>
                        {({ getFieldValue }) => getFieldValue('type') === 'FG' ? (
                            <Form.Item name="packWeight" label="Pack Weight (grams)">
                                <InputNumber style={{ width: '100%' }} min={1} />
                            </Form.Item>
                        ) : null}
                    </Form.Item>
                    <Form.Item><Button type="primary" htmlType="submit" block>Add Item</Button></Form.Item>
                </Form>
            </Modal>

            {/* Add Recipe Modal */}
            <Modal title="Add New Recipe" open={recipeModal} onCancel={() => setRecipeModal(false)} footer={null} destroyOnClose width={600}>
                <Form form={recipeForm} layout="vertical" onFinish={handleAddRecipe}>
                    <Form.Item name="name" label="Recipe Name" rules={[{ required: true }]}><Input placeholder="e.g. Kitchen King Masala" /></Form.Item>
                    <Form.Item name="outputItemId" label="Output Product (Bulk)" rules={[{ required: true }]}>
                        <Select options={state.items.filter(i => i.type === 'BULK').map(i => ({ label: i.name, value: i.id }))} />
                    </Form.Item>
                    <div className="section-title">Ingredients</div>
                    <Form.List name="ingredients" initialValue={[{}]}>
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(field => (
                                    <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="start">
                                        <Form.Item name={[field.name, 'itemId']} rules={[{ required: true, message: 'Select item' }]}>
                                            <Select placeholder="Raw Material" style={{ width: 200 }} options={rawItems.map(i => ({ label: i.name, value: i.id }))} />
                                        </Form.Item>
                                        <Form.Item name={[field.name, 'standardQty']} rules={[{ required: true, message: 'Qty' }]}>
                                            <InputNumber placeholder="Qty (KG)" min={0.1} style={{ width: 120 }} />
                                        </Form.Item>
                                        <Button danger onClick={() => remove(field.name)} size="small">✕</Button>
                                    </Space>
                                ))}
                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Add Ingredient</Button>
                            </>
                        )}
                    </Form.List>
                    <Space style={{ width: '100%', marginTop: 16 }} size="middle">
                        <Form.Item name="expectedYieldPercent" label="Expected Yield %" initialValue={95} style={{ flex: 1 }}>
                            <InputNumber style={{ width: '100%' }} min={1} max={100} />
                        </Form.Item>
                        <Form.Item name="expectedWastagePercent" label="Expected Wastage %" initialValue={5} style={{ flex: 1 }}>
                            <InputNumber style={{ width: '100%' }} min={0} max={100} />
                        </Form.Item>
                    </Space>
                    <Form.Item><Button type="primary" htmlType="submit" block>Save Recipe</Button></Form.Item>
                </Form>
            </Modal>

            {/* Add Supplier Modal */}
            <Modal title="Add Supplier" open={supplierModal} onCancel={() => setSupplierModal(false)} footer={null} destroyOnClose>
                <Form form={supplierForm} layout="vertical" onFinish={handleAddSupplier}>
                    <Form.Item name="name" label="Supplier Name" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="contact" label="Contact" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="leadTimeDays" label="Lead Time (days)" initialValue={3}><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
                    <Form.Item><Button type="primary" htmlType="submit" block>Add Supplier</Button></Form.Item>
                </Form>
            </Modal>

            {/* Add Customer Modal */}
            <Modal title="Add Customer" open={customerModal} onCancel={() => setCustomerModal(false)} footer={null} destroyOnClose>
                <Form form={customerForm} layout="vertical" onFinish={handleAddCustomer}>
                    <Form.Item name="name" label="Customer Name" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="contact" label="Contact" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="channel" label="Channel" rules={[{ required: true }]}>
                        <Select options={[
                            { label: 'Distributor', value: 'Distributor' },
                            { label: 'Online', value: 'Online' },
                            { label: 'Direct', value: 'Direct' },
                            { label: 'Retail', value: 'Retail' },
                        ]} />
                    </Form.Item>
                    <Form.Item><Button type="primary" htmlType="submit" block>Add Customer</Button></Form.Item>
                </Form>
            </Modal>
        </>
    );
}
