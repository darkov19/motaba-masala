import { useState } from 'react';
import { useDemo } from '../App';
import { addItem, updateItem, deleteItem, addRecipe, deleteRecipe, addSupplier, addCustomer } from '../store/demoStore';
import { Item, ItemType, UnitType } from '../types';

const TYPE_LABELS: Record<ItemType, string> = { RAW: 'Raw Material', BULK: 'Bulk Powder', PACKING: 'Packing Material', FG: 'Finished Good' };
const BADGE_CLASS: Record<ItemType, string> = { RAW: 'badge-raw', BULK: 'badge-bulk', PACKING: 'badge-packing', FG: 'badge-fg' };

export default function MasterDataPage() {
    const { data, setData, toast } = useDemo();
    const [tab, setTab] = useState<'items' | 'recipes' | 'suppliers' | 'customers'>('items');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [itemForm, setItemForm] = useState({
        name: '',
        type: 'RAW' as ItemType,
        baseUnit: 'KG' as UnitType,
        reorderLevel: 0,
        packWeight: 0,
        sourceBulkItemId: '',
        packingMaterials: [] as { itemId: string; quantityPerUnit: number }[]
    });
    const [recipeForm, setRecipeForm] = useState({ name: '', outputItemId: '', outputQty: 0, wastePct: 5, ingredients: [{ itemId: '', quantity: 0 }] });
    const [supplierForm, setSupplierForm] = useState({ name: '', contact: '', phone: '', leadTimeDays: 7 });
    const [customerForm, setCustomerForm] = useState({ name: '', contact: '', phone: '', channel: '' });

    const resetForm = () => {
        setEditingId(null);
        setItemForm({ name: '', type: 'RAW', baseUnit: 'KG', reorderLevel: 0, packWeight: 0, sourceBulkItemId: '', packingMaterials: [] });
        setSupplierForm({ name: '', contact: '', phone: '', leadTimeDays: 7 });
        setCustomerForm({ name: '', contact: '', phone: '', channel: '' });
    };

    const handleSaveItem = () => {
        if (!itemForm.name) { toast('Item name required', 'error'); return; }

        if (editingId) {
            setData(updateItem(data, editingId, itemForm));
            toast(`Item "${itemForm.name}" updated`);
        } else {
            setData(addItem(data, { ...itemForm, currentStock: 0, avgCost: 0 }));
            toast(`Item "${itemForm.name}" added`);
        }

        setShowModal(false);
        resetForm();
    };

    const handleEditItem = (item: Item) => {
        setEditingId(item.id);
        setItemForm({
            name: item.name,
            type: item.type,
            baseUnit: item.baseUnit,
            reorderLevel: item.reorderLevel,
            packWeight: item.packWeight || 0,
            sourceBulkItemId: item.sourceBulkItemId || '',
            packingMaterials: item.packingMaterials || []
        });
        setShowModal(true);
    };

    const handleAddRecipe = () => {
        if (!recipeForm.name || !recipeForm.outputItemId) { toast('Fill required fields', 'error'); return; }
        const validIngredients = recipeForm.ingredients.filter(i => i.itemId && i.quantity > 0);
        if (validIngredients.length === 0) { toast('Add at least one ingredient', 'error'); return; }
        setData(addRecipe(data, {
            name: recipeForm.name, outputItemId: recipeForm.outputItemId,
            outputQuantity: recipeForm.outputQty, outputUnit: 'KG', expectedWastePct: recipeForm.wastePct,
            ingredients: validIngredients.map(i => ({ itemId: i.itemId, quantity: i.quantity, unit: 'KG' as UnitType })),
        }));
        setShowModal(false);
        toast(`Recipe "${recipeForm.name}" added`);
    };

    const handleAddSupplier = () => {
        if (!supplierForm.name) { toast('Name required', 'error'); return; }
        setData(addSupplier(data, supplierForm));
        setShowModal(false);
        toast(`Supplier "${supplierForm.name}" added`);
    };

    const handleAddCustomer = () => {
        if (!customerForm.name) { toast('Name required', 'error'); return; }
        setData(addCustomer(data, customerForm));
        setShowModal(false);
        toast(`Customer "${customerForm.name}" added`);
    };

    const bulkItems = data.items.filter(i => i.type === 'BULK');
    const rawItems = data.items.filter(i => i.type === 'RAW');

    return (
        <div>
            <h1 className="page-title">Master Data</h1>
            <p className="page-subtitle">Configure items, recipes, suppliers, and customers. Pre-loaded with sample spice data.</p>

            <div className="tabs">
                {(['items', 'recipes', 'suppliers', 'customers'] as const).map(t => (
                    <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setShowModal(false); }}>
                        {t === 'items' ? 'Items' : t === 'recipes' ? 'Recipes' : t === 'suppliers' ? 'Suppliers' : 'Customers'}
                    </button>
                ))}
            </div>

            {/* Items Tab */}
            {tab === 'items' && (
                <div className="history-section">
                    <div className="section-header">
                        <h3>Item Master</h3>
                        <div className="flex gap-8 items-center">
                            <span className="record-count">{data.items.length} items</span>
                            <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowModal(true); }}>+ Add Item</button>
                        </div>
                    </div>
                    <table>
                        <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Unit</th><th>Stock</th><th>Avg Cost</th><th>Value</th><th>Reorder</th><th></th></tr></thead>
                        <tbody>
                            {data.items.map(it => (
                                <tr key={it.id}>
                                    <td className="mono">{it.id}</td>
                                    <td><strong>{it.name}</strong></td>
                                    <td><span className={`badge-type ${BADGE_CLASS[it.type]}`}>{TYPE_LABELS[it.type]}</span></td>
                                    <td>{it.baseUnit}</td>
                                    <td className={it.currentStock <= it.reorderLevel ? 'text-danger' : ''}><strong>{it.currentStock.toLocaleString()}</strong></td>
                                    <td className="currency">₹{it.avgCost.toFixed(2)}</td>
                                    <td className="currency">₹{(it.currentStock * it.avgCost).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                                    <td>{it.reorderLevel}</td>
                                    <td>
                                        <div className="flex gap-8">
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleEditItem(it)}>Edit</button>
                                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => { if (confirm(`Delete ${it.name}?`)) { setData(deleteItem(data, it.id)); toast(`Deleted "${it.name}"`); } }}>Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Recipes Tab */}
            {tab === 'recipes' && (
                <div className="history-section">
                    <div className="section-header">
                        <h3>Recipes / BOM</h3>
                        <div className="flex gap-8 items-center">
                            <span className="record-count">{data.recipes.length} recipes</span>
                            <button className="btn btn-primary btn-sm" onClick={() => { setRecipeForm({ name: '', outputItemId: '', outputQty: 0, wastePct: 5, ingredients: [{ itemId: '', quantity: 0 }] }); setShowModal(true); }}>+ Add Recipe</button>
                        </div>
                    </div>
                    <table>
                        <thead><tr><th>ID</th><th>Name</th><th>Output</th><th>Expected Waste</th><th>Ingredients</th><th></th></tr></thead>
                        <tbody>
                            {data.recipes.map(r => {
                                const outItem = data.items.find(i => i.id === r.outputItemId);
                                return (
                                    <tr key={r.id}>
                                        <td className="mono">{r.id}</td>
                                        <td><strong>{r.name}</strong></td>
                                        <td><span className="text-bulk">{outItem?.name || r.outputItemId}</span> ({r.outputQuantity} {r.outputUnit})</td>
                                        <td><span className="text-warning">{r.expectedWastePct}%</span></td>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {r.ingredients.map(ing => {
                                                const item = data.items.find(i => i.id === ing.itemId);
                                                return `${item?.name || ing.itemId} (${ing.quantity} ${ing.unit})`;
                                            }).join(' + ')}
                                        </td>
                                        <td>
                                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => { setData(deleteRecipe(data, r.id)); toast(`Deleted recipe "${r.name}"`); }}>Delete</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Suppliers Tab */}
            {tab === 'suppliers' && (
                <div className="history-section">
                    <div className="section-header">
                        <h3>Suppliers</h3>
                        <div className="flex gap-8 items-center">
                            <span className="record-count">{data.suppliers.length} suppliers</span>
                            <button className="btn btn-primary btn-sm" onClick={() => { setSupplierForm({ name: '', contact: '', phone: '', leadTimeDays: 7 }); setShowModal(true); }}>+ Add Supplier</button>
                        </div>
                    </div>
                    <table>
                        <thead><tr><th>ID</th><th>Name</th><th>Contact</th><th>Phone</th><th>Lead Time</th></tr></thead>
                        <tbody>
                            {data.suppliers.map(s => (
                                <tr key={s.id}><td className="mono">{s.id}</td><td><strong>{s.name}</strong></td><td>{s.contact}</td><td>{s.phone}</td><td>{s.leadTimeDays} days</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Customers Tab */}
            {tab === 'customers' && (
                <div className="history-section">
                    <div className="section-header">
                        <h3>Customers</h3>
                        <div className="flex gap-8 items-center">
                            <span className="record-count">{data.customers.length} customers</span>
                            <button className="btn btn-primary btn-sm" onClick={() => { setCustomerForm({ name: '', contact: '', phone: '', channel: '' }); setShowModal(true); }}>+ Add Customer</button>
                        </div>
                    </div>
                    <table>
                        <thead><tr><th>ID</th><th>Name</th><th>Contact</th><th>Phone</th><th>Channel</th></tr></thead>
                        <tbody>
                            {data.customers.map(c => (
                                <tr key={c.id}><td className="mono">{c.id}</td><td><strong>{c.name}</strong></td><td>{c.contact}</td><td>{c.phone}</td><td>{c.channel}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modals */}
            {showModal && tab === 'items' && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><span className="modal-title">{editingId ? 'Edit Item' : 'Add New Item'}</span><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
                        <div className="form-group"><label>Name</label><input value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} placeholder="e.g. Fennel Seeds" /></div>
                        <div className="form-row">
                            <div className="form-group"><label>Type</label><select value={itemForm.type} onChange={e => setItemForm({ ...itemForm, type: e.target.value as ItemType })}><option value="RAW">Raw Material</option><option value="BULK">Bulk Powder</option><option value="PACKING">Packing Material</option><option value="FG">Finished Good</option></select></div>
                            <div className="form-group"><label>Base Unit</label><select value={itemForm.baseUnit} onChange={e => setItemForm({ ...itemForm, baseUnit: e.target.value as UnitType })}><option value="KG">KG</option><option value="GRAM">Gram</option><option value="PCS">Pieces</option><option value="BOX">Box</option></select></div>
                        </div>
                        <div className="form-row">
                            <div className="form-group"><label>Reorder Level</label><input type="number" value={itemForm.reorderLevel} onChange={e => setItemForm({ ...itemForm, reorderLevel: +e.target.value })} /></div>
                            {itemForm.type === 'FG' && (
                                <>
                                    <div className="form-group"><label>Pack Weight (grams)</label><input type="number" value={itemForm.packWeight} onChange={e => setItemForm({ ...itemForm, packWeight: +e.target.value })} /></div>
                                    <div className="form-group"><label>Source Bulk Powder</label><select value={itemForm.sourceBulkItemId} onChange={e => setItemForm({ ...itemForm, sourceBulkItemId: e.target.value })}><option value="">Select Bulk...</option>{data.items.filter(i => i.type === 'BULK').map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
                                </>
                            )}
                        </div>

                        {itemForm.type === 'FG' && (
                            <div style={{ marginTop: 16 }}>
                                <label>Packing Requirements (BOM)</label>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 12 }}>Define materials used per piece produced.</p>
                                {itemForm.packingMaterials.map((pm, idx) => (
                                    <div key={idx} className="flex gap-8 mb-8">
                                        <select
                                            value={pm.itemId}
                                            onChange={e => {
                                                const nm = [...itemForm.packingMaterials];
                                                nm[idx].itemId = e.target.value;
                                                setItemForm({ ...itemForm, packingMaterials: nm });
                                            }}
                                            style={{ flex: 2 }}
                                        >
                                            <option value="">Select Packing Material...</option>
                                            {data.items.filter(i => i.type === 'PACKING').map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                        </select>
                                        <input
                                            type="number"
                                            placeholder="Qty/Unit"
                                            value={pm.quantityPerUnit || ''}
                                            onChange={e => {
                                                const nm = [...itemForm.packingMaterials];
                                                nm[idx].quantityPerUnit = +e.target.value;
                                                setItemForm({ ...itemForm, packingMaterials: nm });
                                            }}
                                            style={{ flex: 1 }}
                                        />
                                        <button className="btn btn-ghost btn-sm" onClick={() => setItemForm({ ...itemForm, packingMaterials: itemForm.packingMaterials.filter((_, i) => i !== idx) })}>✕</button>
                                    </div>
                                ))}
                                <button className="add-line-btn" onClick={() => setItemForm({ ...itemForm, packingMaterials: [...itemForm.packingMaterials, { itemId: '', quantityPerUnit: 1 }] })}>+ Add Requirement</button>
                            </div>
                        )}

                        <div className="modal-actions">
                            <button className="btn btn-outline" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveItem}>{editingId ? 'Update Item' : 'Add Item'}</button>
                        </div>
                    </div>
                </div>
            )}

            {showModal && tab === 'recipes' && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><span className="modal-title">Add New Recipe</span><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
                        <div className="form-group"><label>Recipe Name</label><input value={recipeForm.name} onChange={e => setRecipeForm({ ...recipeForm, name: e.target.value })} placeholder="e.g. Turmeric Powder" /></div>
                        <div className="form-row">
                            <div className="form-group"><label>Output Item</label><select value={recipeForm.outputItemId} onChange={e => setRecipeForm({ ...recipeForm, outputItemId: e.target.value })}><option value="">Select...</option>{bulkItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
                            <div className="form-group"><label>Expected Output (KG)</label><input type="number" value={recipeForm.outputQty || ''} onChange={e => setRecipeForm({ ...recipeForm, outputQty: +e.target.value })} /></div>
                        </div>
                        <div className="form-group"><label>Expected Waste %</label><input type="number" value={recipeForm.wastePct} onChange={e => setRecipeForm({ ...recipeForm, wastePct: +e.target.value })} /></div>
                        <label>Ingredients</label>
                        {recipeForm.ingredients.map((ing, idx) => (
                            <div key={idx} className="flex gap-8 mb-16">
                                <select value={ing.itemId} onChange={e => { const ings = [...recipeForm.ingredients]; ings[idx] = { ...ings[idx], itemId: e.target.value }; setRecipeForm({ ...recipeForm, ingredients: ings }); }} style={{ flex: 2 }}><option value="">Select item...</option>{rawItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
                                <input type="number" placeholder="Qty KG" value={ing.quantity || ''} onChange={e => { const ings = [...recipeForm.ingredients]; ings[idx] = { ...ings[idx], quantity: +e.target.value }; setRecipeForm({ ...recipeForm, ingredients: ings }); }} style={{ flex: 1 }} />
                            </div>
                        ))}
                        <button className="add-line-btn" onClick={() => setRecipeForm({ ...recipeForm, ingredients: [...recipeForm.ingredients, { itemId: '', quantity: 0 }] })}>+ Add Ingredient</button>
                        <div className="modal-actions"><button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAddRecipe}>Add Recipe</button></div>
                    </div>
                </div>
            )}

            {showModal && tab === 'suppliers' && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><span className="modal-title">Add Supplier</span><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
                        <div className="form-group"><label>Company Name</label><input value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} /></div>
                        <div className="form-row">
                            <div className="form-group"><label>Contact Person</label><input value={supplierForm.contact} onChange={e => setSupplierForm({ ...supplierForm, contact: e.target.value })} /></div>
                            <div className="form-group"><label>Phone</label><input value={supplierForm.phone} onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })} /></div>
                        </div>
                        <div className="form-group"><label>Lead Time (Days)</label><input type="number" value={supplierForm.leadTimeDays} onChange={e => setSupplierForm({ ...supplierForm, leadTimeDays: +e.target.value })} /></div>
                        <div className="modal-actions"><button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAddSupplier}>Add Supplier</button></div>
                    </div>
                </div>
            )}

            {showModal && tab === 'customers' && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><span className="modal-title">Add Customer</span><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
                        <div className="form-group"><label>Name</label><input value={customerForm.name} onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })} /></div>
                        <div className="form-row">
                            <div className="form-group"><label>Contact Person</label><input value={customerForm.contact} onChange={e => setCustomerForm({ ...customerForm, contact: e.target.value })} /></div>
                            <div className="form-group"><label>Phone</label><input value={customerForm.phone} onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })} /></div>
                        </div>
                        <div className="form-group"><label>Channel</label><input value={customerForm.channel} onChange={e => setCustomerForm({ ...customerForm, channel: e.target.value })} placeholder="e.g. Distributor, E-Commerce, Retail" /></div>
                        <div className="modal-actions"><button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAddCustomer}>Add Customer</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
