import React, { useState } from 'react';
import { Table, Tag, Tabs, Button, Descriptions, Modal, Form, Select, InputNumber, Input, message, Space, Alert } from 'antd';
import { ArrowRightOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useDemo } from '../DemoContext';
import { ITEMS, RECIPES, SUPPLIERS, CUSTOMERS, ITEM_TYPE_LABELS, ITEM_TYPE_COLORS, getItemName, STANDARD_COSTS, getItemsByType, type Recipe, type RecipeIngredient, type ItemType } from '../data/mockMasters';
import { formatCurrency } from '../data/calculations';

export default function MastersStep() {
    const { state, dispatch } = useDemo();
    const goNext = () => { dispatch({ type: 'COMPLETE_STEP', step: 1 }); dispatch({ type: 'SET_STEP', step: 2 }); };

    // Recipe creation state
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [recipeName, setRecipeName] = useState('');
    const [outputItemId, setOutputItemId] = useState('');
    const [expectedYield, setExpectedYield] = useState<number>(97);
    const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);

    const bulkItems = getItemsByType('BULK');
    const rawItems = getItemsByType('RAW');

    // All recipes = built-in + user-created
    const allRecipes = [...RECIPES, ...state.customRecipes];

    const addIngredient = () => setIngredients([...ingredients, { itemId: '', stdQtyPer100KG: 0 }]);
    const removeIngredient = (i: number) => setIngredients(ingredients.filter((_, idx) => idx !== i));
    const updateIngredient = (i: number, field: keyof RecipeIngredient, val: any) => {
        const updated = [...ingredients];
        updated[i] = { ...updated[i], [field]: val };
        setIngredients(updated);
    };

    const totalProportion = ingredients.reduce((s, ig) => s + ig.stdQtyPer100KG, 0);

    const handleCreateRecipe = () => {
        if (!recipeName.trim()) { message.error('Enter a recipe name'); return; }
        if (!outputItemId) { message.error('Select an output product (Bulk Powder)'); return; }
        const validIngredients = ingredients.filter(ig => ig.itemId && ig.stdQtyPer100KG > 0);
        if (validIngredients.length < 2) { message.error('Add at least 2 ingredients'); return; }
        if (Math.abs(totalProportion - 100) > 0.5) { message.error(`Ingredient quantities must sum to 100 KG. Current total: ${totalProportion.toFixed(1)} KG`); return; }

        const newRecipe: Recipe = {
            id: `REC-${String(allRecipes.length + 1).padStart(3, '0')}`,
            name: recipeName.trim(),
            outputItemId,
            expectedYieldPct: expectedYield,
            ingredients: validIngredients,
        };

        dispatch({ type: 'ADD_RECIPE', recipe: newRecipe });
        message.success(`Recipe "${newRecipe.name}" created successfully!`);
        setShowRecipeModal(false);
        resetForm();
    };

    const resetForm = () => {
        setRecipeName('');
        setOutputItemId('');
        setExpectedYield(97);
        setIngredients([]);
    };

    // ── Table columns ──
    const itemCols = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 90, render: (v: string) => <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>{v}</span> },
        { title: 'Name', dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
        { title: 'Type', dataIndex: 'type', key: 'type', width: 140, render: (v: string) => <Tag color={ITEM_TYPE_COLORS[v as keyof typeof ITEM_TYPE_COLORS]}>{ITEM_TYPE_LABELS[v as keyof typeof ITEM_TYPE_LABELS]}</Tag> },
        { title: 'Unit', dataIndex: 'unit', key: 'unit', width: 80 },
        { title: 'Std. Cost', key: 'cost', width: 120, render: (_: any, r: any) => STANDARD_COSTS[r.id] ? formatCurrency(STANDARD_COSTS[r.id]) : '—' },
    ];

    const recipeTabs = allRecipes.map(r => ({
        key: r.id,
        label: (
            <span>
                {r.name}
                {state.customRecipes.some(cr => cr.id === r.id) && (
                    <Tag color="green" style={{ marginLeft: 6, fontSize: 10 }}>Custom</Tag>
                )}
            </span>
        ),
        children: (
            <div>
                <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
                    <Descriptions.Item label="Output Product">{getItemName(r.outputItemId)}</Descriptions.Item>
                    <Descriptions.Item label="Expected Yield">{r.expectedYieldPct}%</Descriptions.Item>
                </Descriptions>
                <Table size="small" dataSource={r.ingredients.map((ig, i) => ({ key: i, ...ig }))} pagination={false}
                    columns={[
                        { title: 'Ingredient', key: 'name', render: (_: any, row: any) => getItemName(row.itemId) },
                        { title: 'Std. Qty per 100 KG', dataIndex: 'stdQtyPer100KG', key: 'qty', render: (v: number) => `${v} KG` },
                        { title: 'Proportion', key: 'pct', render: (_: any, row: any) => `${row.stdQtyPer100KG}%` },
                    ]}
                />
            </div>
        ),
    }));

    return (
        <div className="demo-step-card">
            <div className="demo-step-header">
                <h2>🗂️ Master Data & Configuration</h2>
                <p>Review the pre-configured master data: Items, Recipes (BOM), Suppliers, and Customers. This data forms the foundation of the inventory system.</p>
            </div>

            <Tabs items={[
                { key: 'items', label: `📦 Items (${ITEMS.length})`, children: <Table size="small" dataSource={ITEMS.map(i => ({ ...i, key: i.id }))} columns={itemCols} pagination={false} /> },
                {
                    key: 'recipes', label: `📝 Recipes (${allRecipes.length})`, children: (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <span style={{ fontSize: 13, color: '#888' }}>
                                    {allRecipes.length} recipe(s) — {state.customRecipes.length} custom
                                </span>
                                <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowRecipeModal(true)} style={{ borderRadius: 12 }}>
                                    Create New Recipe
                                </Button>
                            </div>
                            <Tabs items={recipeTabs} />
                        </>
                    )
                },
                {
                    key: 'suppliers', label: `🏭 Suppliers (${SUPPLIERS.length})`, children: (
                        <Table size="small" dataSource={SUPPLIERS.map(s => ({ ...s, key: s.id }))} pagination={false}
                            columns={[
                                { title: 'ID', dataIndex: 'id', key: 'id', width: 90 },
                                { title: 'Name', dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
                                { title: 'Location', dataIndex: 'location', key: 'location' },
                                { title: 'Phone', dataIndex: 'phone', key: 'phone' },
                            ]}
                        />
                    )
                },
                {
                    key: 'customers', label: `🛒 Customers (${CUSTOMERS.length})`, children: (
                        <Table size="small" dataSource={CUSTOMERS.map(c => ({ ...c, key: c.id }))} pagination={false}
                            columns={[
                                { title: 'ID', dataIndex: 'id', key: 'id', width: 90 },
                                { title: 'Name', dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
                                { title: 'Channel', dataIndex: 'channel', key: 'channel' },
                                { title: 'Location', dataIndex: 'location', key: 'location' },
                            ]}
                        />
                    )
                },
            ]} />

            <div className="demo-step-actions">
                <Button type="primary" size="large" onClick={goNext} style={{ borderRadius: 12 }}>
                    Continue to GRN <ArrowRightOutlined />
                </Button>
            </div>

            {/* ── Recipe Creation Modal ── */}
            <Modal
                title="📝 Create New Recipe (BOM)"
                open={showRecipeModal}
                onCancel={() => { setShowRecipeModal(false); resetForm(); }}
                onOk={handleCreateRecipe}
                okText="✅ Save Recipe"
                width={720}
                okButtonProps={{ style: { borderRadius: 12 } }}
                cancelButtonProps={{ style: { borderRadius: 12 } }}
            >
                <Alert
                    type="info"
                    showIcon
                    message="Define a Bill of Materials (BOM)"
                    description="Specify the output Bulk Powder product, ingredient proportions per 100 KG standard batch, and expected yield percentage. Quantities must total exactly 100 KG."
                    style={{ marginBottom: 20, borderRadius: 12 }}
                />

                <Form layout="vertical">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item label="Recipe Name" required>
                            <Input
                                placeholder="e.g. Chole Masala — Premium Blend"
                                value={recipeName}
                                onChange={e => setRecipeName(e.target.value)}
                            />
                        </Form.Item>
                        <Form.Item label="Output Product (Bulk Powder)" required>
                            <Select
                                placeholder="Select Bulk Powder"
                                value={outputItemId || undefined}
                                onChange={setOutputItemId}
                                options={bulkItems.map(it => ({ value: it.id, label: it.name }))}
                            />
                        </Form.Item>
                    </div>
                    <Form.Item label="Expected Yield %">
                        <InputNumber
                            style={{ width: 180 }}
                            min={50}
                            max={100}
                            step={0.5}
                            value={expectedYield}
                            onChange={v => setExpectedYield(v ?? 97)}
                            addonAfter="%"
                        />
                    </Form.Item>
                </Form>

                <div className="demo-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Ingredients (Raw Materials)</span>
                    <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addIngredient}>
                        Add Ingredient
                    </Button>
                </div>

                {ingredients.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#999' }}>
                        Click "Add Ingredient" to start building the BOM
                    </div>
                )}

                {ingredients.map((ig, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                        <Select
                            style={{ flex: 2 }}
                            placeholder="Select raw material"
                            value={ig.itemId || undefined}
                            onChange={v => updateIngredient(i, 'itemId', v)}
                            options={rawItems
                                .filter(it => !ingredients.some((existing, idx) => idx !== i && existing.itemId === it.id))
                                .map(it => ({ value: it.id, label: it.name }))}
                        />
                        <InputNumber
                            style={{ flex: 1 }}
                            min={0.5}
                            step={0.5}
                            placeholder="KG per 100KG"
                            value={ig.stdQtyPer100KG || undefined}
                            onChange={v => updateIngredient(i, 'stdQtyPer100KG', v ?? 0)}
                            addonAfter="KG"
                        />
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => removeIngredient(i)}
                        />
                    </div>
                ))}

                {ingredients.length > 0 && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginTop: 12,
                        padding: '8px 16px',
                        background: Math.abs(totalProportion - 100) < 0.5 ? '#F6FFED' : '#FFF2F0',
                        borderRadius: 8,
                    }}>
                        <span style={{
                            fontFamily: 'JetBrains Mono',
                            fontWeight: 600,
                            color: Math.abs(totalProportion - 100) < 0.5 ? '#52c41a' : '#ff4d4f',
                        }}>
                            Total: {totalProportion.toFixed(1)} KG / 100 KG
                            {Math.abs(totalProportion - 100) < 0.5 ? ' ✓' : ' — must equal 100'}
                        </span>
                    </div>
                )}
            </Modal>
        </div>
    );
}
