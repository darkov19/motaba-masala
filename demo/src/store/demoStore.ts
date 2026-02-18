import { DemoData, Item, ItemType, Batch, BatchConsumption, GRN, GRNItem, PackingRun, DispatchNote, DispatchItem, StockTransaction, Recipe, Supplier, Customer, RecipeIngredient } from '../types';

const STORAGE_KEY = 'motaba_masala_demo_v2';

function today(): string {
    return new Date().toISOString().split('T')[0];
}

function genId(prefix: string, num: number): string {
    return `${prefix}-${String(num).padStart(4, '0')}`;
}

function genLot(date: string, num: number): string {
    return `LOT-${date.replace(/-/g, '')}-${String(num).padStart(3, '0')}`;
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

// ===== SEED DATA =====
export function createSeedData(): DemoData {
    const d = today();
    return {
        items: [
            { id: 'RAW-001', name: 'Red Chili Seeds', type: 'RAW', baseUnit: 'KG', currentStock: 500, avgCost: 120, reorderLevel: 50, createdAt: d },
            { id: 'RAW-002', name: 'Coriander Seeds', type: 'RAW', baseUnit: 'KG', currentStock: 300, avgCost: 95, reorderLevel: 30, createdAt: d },
            { id: 'RAW-003', name: 'Cumin Seeds', type: 'RAW', baseUnit: 'KG', currentStock: 200, avgCost: 250, reorderLevel: 25, createdAt: d },
            { id: 'RAW-004', name: 'Turmeric Root', type: 'RAW', baseUnit: 'KG', currentStock: 150, avgCost: 110, reorderLevel: 20, createdAt: d },
            { id: 'RAW-005', name: 'Black Pepper', type: 'RAW', baseUnit: 'KG', currentStock: 100, avgCost: 450, reorderLevel: 15, createdAt: d },
            { id: 'BULK-001', name: 'Red Chili Powder', type: 'BULK', baseUnit: 'KG', currentStock: 0, avgCost: 0, reorderLevel: 20, createdAt: d },
            { id: 'BULK-002', name: 'Coriander Powder', type: 'BULK', baseUnit: 'KG', currentStock: 0, avgCost: 0, reorderLevel: 20, createdAt: d },
            { id: 'BULK-003', name: 'Garam Masala Blend', type: 'BULK', baseUnit: 'KG', currentStock: 0, avgCost: 0, reorderLevel: 15, createdAt: d },
            { id: 'PACK-001', name: '50g Pouches', type: 'PACKING', baseUnit: 'PCS', currentStock: 10000, avgCost: 2, reorderLevel: 1000, createdAt: d },
            { id: 'PACK-002', name: '100g Pouches', type: 'PACKING', baseUnit: 'PCS', currentStock: 8000, avgCost: 3, reorderLevel: 800, createdAt: d },
            { id: 'PACK-003', name: '200g Boxes', type: 'PACKING', baseUnit: 'PCS', currentStock: 5000, avgCost: 8, reorderLevel: 500, createdAt: d },
            { id: 'PACK-004', name: 'Printed Labels', type: 'PACKING', baseUnit: 'PCS', currentStock: 20000, avgCost: 0.5, reorderLevel: 2000, createdAt: d },
            { id: 'FG-001', name: 'Red Chili Powder 50g', type: 'FG', baseUnit: 'PCS', currentStock: 0, avgCost: 0, reorderLevel: 100, packWeight: 50, createdAt: d },
            { id: 'FG-002', name: 'Red Chili Powder 100g', type: 'FG', baseUnit: 'PCS', currentStock: 0, avgCost: 0, reorderLevel: 80, packWeight: 100, createdAt: d },
            { id: 'FG-003', name: 'Garam Masala 100g', type: 'FG', baseUnit: 'PCS', currentStock: 0, avgCost: 0, reorderLevel: 80, packWeight: 100, createdAt: d },
            { id: 'FG-004', name: 'Garam Masala 200g Box', type: 'FG', baseUnit: 'PCS', currentStock: 0, avgCost: 0, reorderLevel: 50, packWeight: 200, createdAt: d },
        ],
        recipes: [
            {
                id: 'RCP-001', name: 'Red Chili Powder', outputItemId: 'BULK-001', outputQuantity: 95, outputUnit: 'KG', expectedWastePct: 5, createdAt: d,
                ingredients: [{ itemId: 'RAW-001', quantity: 100, unit: 'KG' }],
            },
            {
                id: 'RCP-002', name: 'Coriander Powder', outputItemId: 'BULK-002', outputQuantity: 92, outputUnit: 'KG', expectedWastePct: 8, createdAt: d,
                ingredients: [{ itemId: 'RAW-002', quantity: 100, unit: 'KG' }],
            },
            {
                id: 'RCP-003', name: 'Garam Masala Blend', outputItemId: 'BULK-003', outputQuantity: 93, outputUnit: 'KG', expectedWastePct: 7, createdAt: d,
                ingredients: [
                    { itemId: 'RAW-003', quantity: 40, unit: 'KG' },
                    { itemId: 'RAW-002', quantity: 30, unit: 'KG' },
                    { itemId: 'RAW-005', quantity: 20, unit: 'KG' },
                    { itemId: 'RAW-001', quantity: 10, unit: 'KG' },
                ],
            },
        ],
        suppliers: [
            { id: 'SUP-001', name: 'Raj Spice Farms', contact: 'Rajesh Kumar', phone: '+91 98765 43210', leadTimeDays: 7, createdAt: d },
            { id: 'SUP-002', name: 'Gujarat Agro Traders', contact: 'Amit Patel', phone: '+91 87654 32109', leadTimeDays: 5, createdAt: d },
            { id: 'SUP-003', name: 'Mumbai Packaging Co.', contact: 'Priya Sharma', phone: '+91 76543 21098', leadTimeDays: 3, createdAt: d },
        ],
        customers: [
            { id: 'CUS-001', name: 'Delhi Distributor Hub', contact: 'Vikram Singh', phone: '+91 99887 76655', channel: 'Distributor', createdAt: d },
            { id: 'CUS-002', name: 'BigBasket Online', contact: 'Neha Gupta', phone: '+91 88776 65544', channel: 'E-Commerce', createdAt: d },
            { id: 'CUS-003', name: 'Heritage Mart Retail', contact: 'Suresh Reddy', phone: '+91 77665 54433', channel: 'Retail Chain', createdAt: d },
        ],
        grns: [],
        batches: [],
        packingRuns: [],
        dispatches: [],
        transactions: [],
        nextIds: {
            item: { RAW: 6, BULK: 4, PACKING: 5, FG: 5 },
            grn: 1, batch: 1, packing: 1, dispatch: 1, lot: 1, transaction: 1,
        },
    };
}

// ===== CRUD =====
export function loadData(): DemoData {
    try {
        const s = localStorage.getItem(STORAGE_KEY);
        if (s) return JSON.parse(s);
    } catch (e) { console.error('Load failed:', e); }
    const seed = createSeedData();
    saveData(seed);
    return seed;
}

export function saveData(data: DemoData): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetDemo(): DemoData {
    const seed = createSeedData();
    saveData(seed);
    return seed;
}

// ===== ITEM CRUD =====
export function addItem(data: DemoData, item: Omit<Item, 'id' | 'createdAt'>): DemoData {
    const num = data.nextIds.item[item.type];
    const newItem: Item = {
        ...item,
        id: `${item.type}-${String(num).padStart(3, '0')}`,
        createdAt: today(),
    };
    const nd = { ...data, items: [...data.items, newItem], nextIds: { ...data.nextIds, item: { ...data.nextIds.item, [item.type]: num + 1 } } };
    saveData(nd);
    return nd;
}

export function updateItem(data: DemoData, id: string, updates: Partial<Item>): DemoData {
    const nd = { ...data, items: data.items.map(i => i.id === id ? { ...i, ...updates } : i) };
    saveData(nd);
    return nd;
}

export function deleteItem(data: DemoData, id: string): DemoData {
    const nd = { ...data, items: data.items.filter(i => i.id !== id) };
    saveData(nd);
    return nd;
}

// ===== RECIPE CRUD =====
export function addRecipe(data: DemoData, recipe: Omit<Recipe, 'id' | 'createdAt'>): DemoData {
    const num = data.recipes.length + 1;
    const newRecipe: Recipe = { ...recipe, id: `RCP-${String(num).padStart(3, '0')}`, createdAt: today() };
    const nd = { ...data, recipes: [...data.recipes, newRecipe] };
    saveData(nd);
    return nd;
}

export function deleteRecipe(data: DemoData, id: string): DemoData {
    const nd = { ...data, recipes: data.recipes.filter(r => r.id !== id) };
    saveData(nd);
    return nd;
}

// ===== SUPPLIER/CUSTOMER CRUD =====
export function addSupplier(data: DemoData, s: Omit<Supplier, 'id' | 'createdAt'>): DemoData {
    const num = data.suppliers.length + 1;
    const ns: Supplier = { ...s, id: `SUP-${String(num).padStart(3, '0')}`, createdAt: today() };
    const nd = { ...data, suppliers: [...data.suppliers, ns] };
    saveData(nd);
    return nd;
}

export function addCustomer(data: DemoData, c: Omit<Customer, 'id' | 'createdAt'>): DemoData {
    const num = data.customers.length + 1;
    const nc: Customer = { ...c, id: `CUS-${String(num).padStart(3, '0')}`, createdAt: today() };
    const nd = { ...data, customers: [...data.customers, nc] };
    saveData(nd);
    return nd;
}

// ===== GRN (Procurement) =====
export function processGRN(data: DemoData, supplierId: string, invoiceNumber: string, grnItems: Omit<GRNItem, 'lotNumber'>[]): DemoData {
    const grnId = genId('GRN', data.nextIds.grn);
    const grnDate = today();
    let nd = { ...data };
    const items: GRNItem[] = [];
    const txns: StockTransaction[] = [];

    for (const gi of grnItems) {
        const lot = genLot(grnDate, nd.nextIds.lot);
        nd.nextIds.lot++;
        items.push({ ...gi, lotNumber: lot });

        const item = nd.items.find(i => i.id === gi.itemId)!;
        const oldVal = item.currentStock * item.avgCost;
        const newVal = gi.quantity * gi.unitPrice;
        const newStock = item.currentStock + gi.quantity;
        const newAvg = newStock > 0 ? round2((oldVal + newVal) / newStock) : gi.unitPrice;

        nd.items = nd.items.map(i => i.id === gi.itemId ? { ...i, currentStock: round2(newStock), avgCost: newAvg } : i);

        const txId = genId('TXN', nd.nextIds.transaction);
        nd.nextIds.transaction++;
        txns.push({
            id: txId, date: grnDate, type: 'GRN', itemId: gi.itemId, quantity: gi.quantity,
            reference: grnId,
            description: `Received ${gi.quantity} ${item.baseUnit} of ${item.name} @ ₹${gi.unitPrice}/${item.baseUnit}`,
        });
    }

    const grn: GRN = { id: grnId, supplierId, invoiceNumber, date: grnDate, items, createdAt: grnDate };
    nd.grns = [...nd.grns, grn];
    nd.transactions = [...nd.transactions, ...txns];
    nd.nextIds.grn++;
    saveData(nd);
    return nd;
}

// ===== PRODUCTION =====
export function createBatch(data: DemoData, recipeId: string, plannedQty: number): DemoData {
    const batchId = genId('BATCH', data.nextIds.batch);
    const recipe = data.recipes.find(r => r.id === recipeId)!;
    const ratio = plannedQty / recipe.outputQuantity;

    const consumedMaterials: BatchConsumption[] = recipe.ingredients.map(ing => ({
        itemId: ing.itemId, standardQty: round2(ing.quantity * ratio), actualQty: 0,
    }));

    const batch: Batch = {
        id: batchId, recipeId, status: 'PLANNED', plannedQty, actualOutput: 0, wastage: 0,
        yieldPct: 0, costPerUnit: 0, consumedMaterials, date: today(), createdAt: today(),
    };

    const nd = { ...data, batches: [...data.batches, batch], nextIds: { ...data.nextIds, batch: data.nextIds.batch + 1 } };
    saveData(nd);
    return nd;
}

export function completeBatch(data: DemoData, batchId: string, actuals: { itemId: string; actualQty: number }[], actualOutput: number, wastage: number): DemoData {
    let nd = { ...data };
    const batch = nd.batches.find(b => b.id === batchId)!;
    const recipe = nd.recipes.find(r => r.id === batch.recipeId)!;
    const txns: StockTransaction[] = [];
    let totalInputCost = 0;

    for (const a of actuals) {
        const item = nd.items.find(i => i.id === a.itemId)!;
        if (item.currentStock < a.actualQty) throw new Error(`Insufficient ${item.name}: need ${a.actualQty}, have ${item.currentStock}`);
        totalInputCost += a.actualQty * item.avgCost;
        nd.items = nd.items.map(i => i.id === a.itemId ? { ...i, currentStock: round2(i.currentStock - a.actualQty) } : i);

        const txId = genId('TXN', nd.nextIds.transaction); nd.nextIds.transaction++;
        txns.push({ id: txId, date: today(), type: 'PRODUCTION_OUT', itemId: a.itemId, quantity: -a.actualQty, reference: batchId, description: `Consumed ${a.actualQty} ${item.baseUnit} of ${item.name} for ${batchId}` });
    }

    const totalInput = actuals.reduce((s, a) => s + a.actualQty, 0);
    const yieldPct = totalInput > 0 ? round2((actualOutput / totalInput) * 100) : 0;
    const costPerUnit = actualOutput > 0 ? round2(totalInputCost / actualOutput) : 0;

    const outItem = nd.items.find(i => i.id === recipe.outputItemId)!;
    const oldVal = outItem.currentStock * outItem.avgCost;
    const newVal = actualOutput * costPerUnit;
    const newStock = outItem.currentStock + actualOutput;
    const newAvg = newStock > 0 ? round2((oldVal + newVal) / newStock) : costPerUnit;

    nd.items = nd.items.map(i => i.id === recipe.outputItemId ? { ...i, currentStock: round2(newStock), avgCost: newAvg } : i);

    const txOut = genId('TXN', nd.nextIds.transaction); nd.nextIds.transaction++;
    txns.push({ id: txOut, date: today(), type: 'PRODUCTION_IN', itemId: recipe.outputItemId, quantity: actualOutput, reference: batchId, description: `Produced ${actualOutput} KG of ${outItem.name} (Yield: ${yieldPct}%, Wastage: ${wastage} KG, Cost: ₹${costPerUnit}/KG)` });

    nd.batches = nd.batches.map(b => b.id === batchId ? {
        ...b, status: 'COMPLETED' as const, actualOutput, wastage, yieldPct, costPerUnit,
        consumedMaterials: b.consumedMaterials.map(cm => { const a = actuals.find(x => x.itemId === cm.itemId); return a ? { ...cm, actualQty: a.actualQty } : cm; }),
    } : b);
    nd.transactions = [...nd.transactions, ...txns];
    saveData(nd);
    return nd;
}

// ===== PACKING =====
export function completePackingRun(data: DemoData, sourceBatchId: string, fgItemId: string, outputQty: number, packMats: { itemId: string; quantity: number }[]): DemoData {
    let nd = { ...data };
    const fgItem = nd.items.find(i => i.id === fgItemId)!;
    const batch = nd.batches.find(b => b.id === sourceBatchId)!;
    const recipe = nd.recipes.find(r => r.id === batch.recipeId)!;
    const bulkItem = nd.items.find(i => i.id === recipe.outputItemId)!;
    const packWeightKg = (fgItem.packWeight || 100) / 1000;
    const bulkConsumed = round2(outputQty * packWeightKg);
    const packRef = genId('PACK', nd.nextIds.packing);
    const txns: StockTransaction[] = [];

    if (bulkItem.currentStock < bulkConsumed) throw new Error(`Insufficient ${bulkItem.name}: need ${bulkConsumed} KG, have ${bulkItem.currentStock} KG`);

    nd.items = nd.items.map(i => i.id === recipe.outputItemId ? { ...i, currentStock: round2(i.currentStock - bulkConsumed) } : i);
    let txId = genId('TXN', nd.nextIds.transaction); nd.nextIds.transaction++;
    txns.push({ id: txId, date: today(), type: 'PACKING_OUT', itemId: recipe.outputItemId, quantity: -bulkConsumed, reference: packRef, description: `Consumed ${bulkConsumed} KG of ${bulkItem.name} for packing` });

    let packingCostTotal = 0;
    for (const pm of packMats) {
        const pi = nd.items.find(i => i.id === pm.itemId)!;
        if (pi.currentStock < pm.quantity) throw new Error(`Insufficient ${pi.name}: need ${pm.quantity}, have ${pi.currentStock}`);
        packingCostTotal += pm.quantity * pi.avgCost;
        nd.items = nd.items.map(i => i.id === pm.itemId ? { ...i, currentStock: i.currentStock - pm.quantity } : i);
        txId = genId('TXN', nd.nextIds.transaction); nd.nextIds.transaction++;
        txns.push({ id: txId, date: today(), type: 'PACKING_OUT', itemId: pm.itemId, quantity: -pm.quantity, reference: packRef, description: `Used ${pm.quantity} ${pi.name} for packing` });
    }

    const bulkCostPerUnit = bulkItem.avgCost * packWeightKg;
    const packCostPerUnit = outputQty > 0 ? round2(packingCostTotal / outputQty) : 0;
    const fgCostPerUnit = round2(bulkCostPerUnit + packCostPerUnit);

    const oldFgVal = fgItem.currentStock * fgItem.avgCost;
    const newFgVal = outputQty * fgCostPerUnit;
    const newFgStock = fgItem.currentStock + outputQty;
    const newFgAvg = newFgStock > 0 ? round2((oldFgVal + newFgVal) / newFgStock) : fgCostPerUnit;

    nd.items = nd.items.map(i => i.id === fgItemId ? { ...i, currentStock: newFgStock, avgCost: newFgAvg } : i);
    txId = genId('TXN', nd.nextIds.transaction); nd.nextIds.transaction++;
    txns.push({ id: txId, date: today(), type: 'PACKING_IN', itemId: fgItemId, quantity: outputQty, reference: packRef, description: `Packed ${outputQty} units of ${fgItem.name} @ ₹${fgCostPerUnit}/unit` });

    const pr: PackingRun = { id: packRef, sourceBatchId, fgItemId, bulkItemId: recipe.outputItemId, outputQuantity: outputQty, bulkConsumed, packingMaterials: packMats, fgCostPerUnit, date: today(), createdAt: today() };
    nd.packingRuns = [...nd.packingRuns, pr];
    nd.transactions = [...nd.transactions, ...txns];
    nd.nextIds.packing++;
    saveData(nd);
    return nd;
}

// ===== DISPATCH =====
export function createDispatch(data: DemoData, customerId: string, items: { fgItemId: string; quantity: number; unitPrice: number }[]): DemoData {
    let nd = { ...data };
    const dispId = genId('DSP', nd.nextIds.dispatch);
    const txns: StockTransaction[] = [];
    let totalValue = 0;

    const dispItems: DispatchItem[] = items.map(di => {
        const fg = nd.items.find(i => i.id === di.fgItemId)!;
        if (fg.currentStock < di.quantity) throw new Error(`Insufficient ${fg.name}: need ${di.quantity}, have ${fg.currentStock}`);
        nd.items = nd.items.map(i => i.id === di.fgItemId ? { ...i, currentStock: i.currentStock - di.quantity } : i);
        const lineVal = di.quantity * di.unitPrice;
        totalValue += lineVal;
        const txId = genId('TXN', nd.nextIds.transaction); nd.nextIds.transaction++;
        txns.push({ id: txId, date: today(), type: 'DISPATCH', itemId: di.fgItemId, quantity: -di.quantity, reference: dispId, description: `Dispatched ${di.quantity} ${fg.name} @ ₹${di.unitPrice}/unit` });
        return { fgItemId: di.fgItemId, quantity: di.quantity, unitPrice: di.unitPrice, batchRef: 'FIFO-Auto' };
    });

    const dn: DispatchNote = { id: dispId, customerId, status: 'DISPATCHED', date: today(), items: dispItems, totalValue: round2(totalValue), createdAt: today() };
    nd.dispatches = [...nd.dispatches, dn];
    nd.transactions = [...nd.transactions, ...txns];
    nd.nextIds.dispatch++;
    saveData(nd);
    return nd;
}

// ===== HELPERS =====
export function getItemsByType(data: DemoData, type: ItemType): Item[] {
    return data.items.filter(i => i.type === type);
}

export function getItemById(data: DemoData, id: string): Item | undefined {
    return data.items.find(i => i.id === id);
}

export function getTotalValue(data: DemoData): number {
    return round2(data.items.reduce((s, i) => s + i.currentStock * i.avgCost, 0));
}

export function getValueByType(data: DemoData, type: ItemType): number {
    return round2(data.items.filter(i => i.type === type).reduce((s, i) => s + i.currentStock * i.avgCost, 0));
}
