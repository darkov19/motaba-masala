import React, { useState, useMemo } from 'react';
import { Select, InputNumber, Button, Table, message, Alert, Statistic, Space, Tag } from 'antd';
import { ArrowRightOutlined, ExperimentOutlined } from '@ant-design/icons';
import { useDemo } from '../DemoContext';
import { RECIPES, getItemName } from '../data/mockMasters';
import { formatCurrency, calcYieldPct, calcWastage } from '../data/calculations';

export default function ProductionStep() {
    const { state, dispatch } = useDemo();
    const [recipeId, setRecipeId] = useState<string>('');
    const [batchSize, setBatchSize] = useState<number>(100);
    const [actuals, setActuals] = useState<Record<string, number>>({});
    const [outputQty, setOutputQty] = useState<number>(0);
    const [submitted, setSubmitted] = useState(false);

    const allRecipes = [...RECIPES, ...state.customRecipes];
    const recipe = allRecipes.find(r => r.id === recipeId);
    const scale = batchSize / 100;

    const ingredients = useMemo(() => {
        if (!recipe) return [];
        return recipe.ingredients.map(ig => {
            const stdQty = ig.stdQtyPer100KG * scale;
            const avail = state.stock[ig.itemId]?.qty ?? 0;
            return { itemId: ig.itemId, name: getItemName(ig.itemId), stdQty, available: avail, actual: actuals[ig.itemId] ?? 0 };
        });
    }, [recipe, scale, actuals, state.stock]);

    const totalInput = ingredients.reduce((s, ig) => s + ig.actual, 0);
    const wastage = calcWastage(totalInput, outputQty);
    const yieldPct = calcYieldPct(outputQty, totalInput);
    const hasInsufficient = ingredients.some(ig => ig.actual > ig.available);

    const totalInputCost = ingredients.reduce((s, ig) => {
        const avgCost = state.stock[ig.itemId]?.avgCost ?? 0;
        return s + ig.actual * avgCost;
    }, 0);
    const costPerKG = outputQty > 0 ? totalInputCost / outputQty : 0;

    const submit = () => {
        if (!recipe) { message.error('Select a recipe'); return; }
        if (totalInput === 0) { message.error('Enter actual consumed quantities'); return; }
        if (outputQty <= 0) { message.error('Enter output quantity'); return; }
        dispatch({
            type: 'PROCESS_PRODUCTION', recipeOutputId: recipe.outputItemId,
            actualConsumption: ingredients.filter(ig => ig.actual > 0).map(ig => ({ itemId: ig.itemId, qty: ig.actual })),
            outputQty,
        });
        setSubmitted(true);
        message.success(`Production batch completed — ${outputQty} KG ${getItemName(recipe.outputItemId)} produced`);
    };

    const goNext = () => { dispatch({ type: 'COMPLETE_STEP', step: 3 }); dispatch({ type: 'SET_STEP', step: 4 }); };

    return (
        <div className="demo-step-card">
            <div className="demo-step-header">
                <h2><ExperimentOutlined /> Production Batch</h2>
                <p>Create a production batch: select a recipe, enter actual consumption, and record the bulk powder output and wastage.</p>
            </div>

            {!submitted ? (
                <>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>Recipe</label>
                            <Select style={{ width: '100%' }} placeholder="Select recipe" value={recipeId || undefined} onChange={v => { setRecipeId(v); setActuals({}); setOutputQty(0); }}
                                options={allRecipes.map(r => ({ value: r.id, label: r.name }))} />
                        </div>
                        <div style={{ width: 180 }}>
                            <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>Batch Size (KG)</label>
                            <InputNumber style={{ width: '100%' }} min={10} step={10} value={batchSize} onChange={v => setBatchSize(v ?? 100)} />
                        </div>
                    </div>

                    {recipe && (
                        <>
                            <div className="demo-section-title">Ingredient Consumption</div>
                            <Alert type="info" showIcon message="Standard quantities are shown for reference. Enter the ACTUAL consumed quantities manually." style={{ marginBottom: 12, borderRadius: 12 }} />
                            <Table size="small" dataSource={ingredients.map((ig, i) => ({ ...ig, key: i }))} pagination={false}
                                columns={[
                                    { title: 'Ingredient', key: 'name', render: (_: any, r: any) => <strong>{r.name}</strong> },
                                    { title: 'Std. Qty', key: 'std', render: (_: any, r: any) => `${r.stdQty.toFixed(1)} KG` },
                                    { title: 'Available', key: 'avail', render: (_: any, r: any) => <span style={{ color: r.available < r.stdQty ? '#ff4d4f' : '#52c41a' }}>{r.available.toFixed(1)} KG</span> },
                                    {
                                        title: 'Actual Consumed', key: 'actual', render: (_: any, r: any) => (
                                            <InputNumber style={{ width: 120 }} min={0} step={0.5} placeholder="KG"
                                                value={actuals[r.itemId] || undefined}
                                                status={r.actual > r.available ? 'error' : undefined}
                                                onChange={v => setActuals({ ...actuals, [r.itemId]: v ?? 0 })} />
                                        )
                                    },
                                ]}
                            />

                            <div className="demo-section-title" style={{ marginTop: 24 }}>Batch Output</div>
                            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 20 }}>
                                <div>
                                    <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>Output Quantity (KG)</label>
                                    <InputNumber style={{ width: 180 }} min={0} step={0.5} value={outputQty || undefined} placeholder="Actual output weight" onChange={v => setOutputQty(v ?? 0)} />
                                </div>
                            </div>

                            {totalInput > 0 && outputQty > 0 && (
                                <div className="demo-info-row">
                                    <div className="demo-stat-card"><div className="label">Total Input</div><div className="value">{totalInput.toFixed(1)} KG</div></div>
                                    <div className="demo-stat-card"><div className="label">Output</div><div className="value">{outputQty.toFixed(1)} KG</div></div>
                                    <div className="demo-stat-card"><div className="label">Wastage</div><div className="value" style={{ color: wastage > totalInput * 0.05 ? '#ff4d4f' : undefined }}>{wastage.toFixed(1)} KG</div></div>
                                    <div className="demo-stat-card"><div className="label">Yield</div><div className="value">{yieldPct.toFixed(1)}%</div></div>
                                    <div className="demo-stat-card"><div className="label">Cost/KG</div><div className="value">{formatCurrency(costPerKG)}</div></div>
                                </div>
                            )}

                            <div className="demo-step-actions">
                                <Button type="primary" size="large" onClick={submit} disabled={hasInsufficient || totalInput === 0 || outputQty <= 0} style={{ borderRadius: 12 }}>
                                    ✅ Complete Batch
                                </Button>
                            </div>
                        </>
                    )}
                </>
            ) : (
                <>
                    <Alert type="success" showIcon message="Production Batch Completed!"
                        description={`${outputQty} KG of ${getItemName(recipe!.outputItemId)} produced at ${formatCurrency(costPerKG)}/KG. Yield: ${yieldPct.toFixed(1)}%, Wastage: ${wastage.toFixed(1)} KG`}
                        style={{ marginBottom: 20, borderRadius: 12 }} />
                    <Space>
                        <Button onClick={() => { setSubmitted(false); setRecipeId(''); setActuals({}); setOutputQty(0); }}>Add Another Batch</Button>
                        <Button type="primary" size="large" onClick={goNext} style={{ borderRadius: 12 }}>
                            Continue to Third-Party <ArrowRightOutlined />
                        </Button>
                    </Space>
                </>
            )}
        </div>
    );
}
