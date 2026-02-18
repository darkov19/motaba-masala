import { useState } from 'react';
import { useDemoContext } from '../data/DemoContext';
import { Card, Form, Select, InputNumber, Button, Table, Typography, Tag, Divider, message, Alert, Descriptions, Space } from 'antd';
import { ExperimentOutlined, CheckCircleOutlined, WarningOutlined, FireOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function ProductionStep() {
    const { state, dispatch } = useDemoContext();
    const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
    const [ingredientQtys, setIngredientQtys] = useState<Record<string, number>>({});
    const [actualOutput, setActualOutput] = useState<number>(0);

    const selectedRecipe = state.recipes.find(r => r.id === selectedRecipeId);
    const totalInput = selectedRecipe ? selectedRecipe.ingredients.reduce((sum, ing) => sum + (ingredientQtys[ing.itemId] || 0), 0) : 0;
    const expectedOutput = totalInput * ((selectedRecipe?.expectedYieldPercent || 97) / 100);
    const wastage = totalInput > 0 ? totalInput - actualOutput : 0;
    const yieldPercent = totalInput > 0 ? ((actualOutput / totalInput) * 100).toFixed(1) : '0';

    const handleRecipeSelect = (recipeId: string) => {
        setSelectedRecipeId(recipeId);
        setIngredientQtys({});
        setActualOutput(0);
    };

    const handleSubmitBatch = () => {
        if (!selectedRecipe || totalInput <= 0 || actualOutput <= 0) {
            message.error('Please complete all fields');
            return;
        }
        const insufficient = selectedRecipe.ingredients.filter(ing => {
            const stock = state.stock.find(s => s.itemId === ing.itemId);
            return !stock || stock.quantity < (ingredientQtys[ing.itemId] || 0);
        });
        if (insufficient.length > 0) {
            message.error(`Insufficient stock: ${insufficient.map(i => i.itemName).join(', ')}`);
            return;
        }
        const batch = {
            id: `BATCH-${String(state.productionBatches.length + 1).padStart(3, '0')}`,
            date: dayjs().format('YYYY-MM-DD'),
            recipeId: selectedRecipe.id,
            recipeName: selectedRecipe.outputItemName,
            batchNumber: `B-${Date.now().toString().slice(-6)}`,
            consumedIngredients: selectedRecipe.ingredients.map(ing => ({
                itemId: ing.itemId, itemName: ing.itemName,
                quantity: ingredientQtys[ing.itemId] || 0, unit: ing.unit,
            })).filter(ing => ing.quantity > 0),
            expectedOutput, actualOutput, wastage, unit: 'KG',
        };
        dispatch({ type: 'ADD_PRODUCTION_BATCH', batch });
        dispatch({ type: 'ADD_NOTIFICATION', notification: { id: Date.now().toString(), message: `Batch ${batch.batchNumber}: ${actualOutput} KG produced (${yieldPercent}% yield)`, type: 'success' } });
        message.success(`Batch ${batch.batchNumber} recorded!`);
        setSelectedRecipeId(''); setIngredientQtys({}); setActualOutput(0);
    };

    return (
        <div className="step-content">
            <div className="step-header">
                <Title level={3} style={{ margin: 0 }}><ExperimentOutlined style={{ marginRight: 8, color: '#7D1111' }} />Production — Batch Creation</Title>
                <Text type="secondary">Select recipe → enter actual ingredient quantities → record output</Text>
            </div>
            <Alert message="Recipe quantities start BLANK — manual verification required" type="info" showIcon style={{ marginBottom: 20 }} />
            <Card title="New Production Batch" style={{ marginBottom: 24 }}>
                <Form layout="vertical">
                    <Form.Item label="Select Recipe">
                        <Select value={selectedRecipeId || undefined} onChange={handleRecipeSelect} placeholder="Choose recipe..." size="large"
                            options={state.recipes.map(r => ({ value: r.id, label: `${r.outputItemName} (${r.ingredients.length} ingredients, ${r.expectedYieldPercent}% yield)` }))} />
                    </Form.Item>
                </Form>
                {selectedRecipe && (<>
                    <Divider><FireOutlined /> Enter Actual Quantities</Divider>
                    <Table dataSource={selectedRecipe.ingredients} rowKey="itemId" pagination={false} size="middle" columns={[
                        { title: 'Ingredient', dataIndex: 'itemName', key: 'name' },
                        { title: 'Unit', dataIndex: 'unit', key: 'unit', width: 80 },
                        { title: 'Stock', key: 'stock', width: 130, render: (_, r) => { const s = state.stock.find(s => s.itemId === r.itemId); return <Tag color={(s?.quantity || 0) > 0 ? 'green' : 'red'}>{(s?.quantity || 0).toFixed(1)} {r.unit}</Tag>; } },
                        { title: 'Qty Used', key: 'qty', width: 200, render: (_, r) => (<Space><InputNumber value={ingredientQtys[r.itemId] || undefined} onChange={v => setIngredientQtys(p => ({ ...p, [r.itemId]: v || 0 }))} min={0} max={state.stock.find(s => s.itemId === r.itemId)?.quantity || 0} step={0.5} style={{ width: 120 }} placeholder="0" /><Text type="secondary">{r.unit}</Text></Space>) },
                    ]} />
                    <Divider>Output</Divider>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                        <Card size="small" style={{ textAlign: 'center', background: '#f6f6f6' }}>
                            <Descriptions column={1} size="small">
                                <Descriptions.Item label="Total Input">{totalInput.toFixed(1)} KG</Descriptions.Item>
                                <Descriptions.Item label="Expected">{expectedOutput.toFixed(1)} KG</Descriptions.Item>
                            </Descriptions>
                        </Card>
                        <Card size="small" style={{ textAlign: 'center' }}>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Actual Output (KG)</Text>
                            <InputNumber value={actualOutput || undefined} onChange={v => setActualOutput(v || 0)} min={0} max={totalInput} step={0.5} size="large" style={{ width: '100%' }} placeholder="Enter weight..." />
                        </Card>
                        <Card size="small" style={{ textAlign: 'center', background: wastage > totalInput * 0.05 ? '#fff2e8' : '#f6ffed' }}>
                            <Descriptions column={1} size="small">
                                <Descriptions.Item label="Wastage"><Text type={wastage > totalInput * 0.05 ? 'warning' : 'success'}>{wastage > 0 ? wastage.toFixed(1) : '0'} KG {wastage > totalInput * 0.05 && <WarningOutlined />}</Text></Descriptions.Item>
                                <Descriptions.Item label="Yield"><Tag color={Number(yieldPercent) >= selectedRecipe.expectedYieldPercent ? 'green' : 'orange'}>{yieldPercent}%</Tag></Descriptions.Item>
                            </Descriptions>
                        </Card>
                    </div>
                    <div style={{ marginTop: 20, textAlign: 'right' }}>
                        <Button type="primary" size="large" icon={<CheckCircleOutlined />} onClick={handleSubmitBatch} disabled={totalInput <= 0 || actualOutput <= 0} style={{ background: '#7D1111', borderColor: '#7D1111' }}>Record Batch</Button>
                    </div>
                </>)}
            </Card>
            {state.productionBatches.length > 0 && (<>
                <Divider>Production History</Divider>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                    {state.productionBatches.map(batch => (
                        <Card key={batch.id} size="small" title={<Space><ExperimentOutlined /><Text strong>{batch.recipeName}</Text><Tag>{batch.batchNumber}</Tag></Space>} extra={<Tag color="green">{batch.date}</Tag>}>
                            <Descriptions size="small" column={2}>
                                <Descriptions.Item label="Input">{batch.consumedIngredients.reduce((s, i) => s + i.quantity, 0).toFixed(1)} KG</Descriptions.Item>
                                <Descriptions.Item label="Output">{batch.actualOutput.toFixed(1)} KG</Descriptions.Item>
                                <Descriptions.Item label="Wastage">{batch.wastage.toFixed(1)} KG</Descriptions.Item>
                                <Descriptions.Item label="Yield"><Tag color={batch.actualOutput / Math.max(batch.consumedIngredients.reduce((s, i) => s + i.quantity, 0), 1) >= 0.95 ? 'green' : 'orange'}>{((batch.actualOutput / Math.max(batch.consumedIngredients.reduce((s, i) => s + i.quantity, 0), 1)) * 100).toFixed(1)}%</Tag></Descriptions.Item>
                            </Descriptions>
                        </Card>
                    ))}
                </div>
            </>)}
        </div>
    );
}
