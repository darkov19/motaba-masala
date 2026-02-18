import {
    Alert,
    Button,
    Card,
    Col,
    Collapse,
    Descriptions,
    Form,
    Input,
    InputNumber,
    Row,
    Select,
    Space,
    Statistic,
    Table,
    Tag,
    Typography,
    message,
} from "antd";
import { useMemo, useState } from "react";

type ItemKind =
    | "RAW"
    | "PACKING"
    | "BULK_INHOUSE"
    | "BULK_THIRD_PARTY"
    | "FINISHED";
type Unit = "KG" | "PCS";
type ReturnCondition = "GOOD" | "DAMAGED";

interface Item {
    id: string;
    name: string;
    kind: ItemKind;
    unit: Unit;
    reorderLevel: number;
}

interface Batch {
    id: string;
    itemId: string;
    lotId: string;
    source: string;
    sourceBatchId?: string;
    qty: number;
    remaining: number;
    unitCost: number;
    createdAt: string;
}

interface LedgerLine {
    itemId: string;
    deltaQty: number;
    batchId?: string;
}

interface LedgerEntry {
    id: string;
    at: string;
    type:
        | "GRN"
        | "PRODUCTION"
        | "PACKING"
        | "DISPATCH"
        | "RETURN"
        | "WRITE_OFF";
    notes: string;
    lines: LedgerLine[];
}

interface DispatchRecord {
    id: string;
    at: string;
    customer: string;
    itemId: string;
    quantity: number;
    allocations: Array<{ batchId: string; qty: number }>;
}

interface ReturnRecord {
    id: string;
    at: string;
    dispatchId: string;
    quantity: number;
    condition: ReturnCondition;
}

interface DemoState {
    items: Item[];
    batches: Batch[];
    ledger: LedgerEntry[];
    dispatches: DispatchRecord[];
    returns: ReturnRecord[];
    seq: number;
}

const STORAGE_KEY = "motaba_demo_v1";
const { Title, Text } = Typography;

const itemSeeds: Item[] = [
    {
        id: "raw_chili",
        name: "Chili Raw",
        kind: "RAW",
        unit: "KG",
        reorderLevel: 40,
    },
    {
        id: "raw_coriander",
        name: "Coriander Raw",
        kind: "RAW",
        unit: "KG",
        reorderLevel: 30,
    },
    {
        id: "pack_pouch_100",
        name: "100g Pouch",
        kind: "PACKING",
        unit: "PCS",
        reorderLevel: 600,
    },
    {
        id: "bulk_garam_inhouse",
        name: "Garam Masala Bulk (In-House)",
        kind: "BULK_INHOUSE",
        unit: "KG",
        reorderLevel: 10,
    },
    {
        id: "bulk_garam_third",
        name: "Garam Masala Bulk (Third-Party)",
        kind: "BULK_THIRD_PARTY",
        unit: "KG",
        reorderLevel: 10,
    },
    {
        id: "fg_garam_100",
        name: "Garam Masala 100g",
        kind: "FINISHED",
        unit: "PCS",
        reorderLevel: 200,
    },
];

function createEmptyState(): DemoState {
    return {
        items: itemSeeds,
        batches: [],
        ledger: [],
        dispatches: [],
        returns: [],
        seq: 1,
    };
}

function safeNum(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function loadState(): DemoState {
    const fallback = createEmptyState();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return fallback;
    }
    try {
        const parsed = JSON.parse(raw) as Partial<DemoState>;
        return {
            items: Array.isArray(parsed.items) ? parsed.items : fallback.items,
            batches: Array.isArray(parsed.batches)
                ? parsed.batches.map(batch => ({
                      ...batch,
                      qty: safeNum(batch.qty),
                      remaining: safeNum(batch.remaining),
                      unitCost: safeNum(batch.unitCost),
                  }))
                : [],
            ledger: Array.isArray(parsed.ledger) ? parsed.ledger : [],
            dispatches: Array.isArray(parsed.dispatches) ? parsed.dispatches : [],
            returns: Array.isArray(parsed.returns) ? parsed.returns : [],
            seq:
                typeof parsed.seq === "number" && parsed.seq > 0
                    ? parsed.seq
                    : fallback.seq,
        };
    } catch {
        return fallback;
    }
}

function nowIso(): string {
    return new Date().toISOString();
}

function getItemMap(items: Item[]): Record<string, Item> {
    return items.reduce<Record<string, Item>>((acc, item) => {
        acc[item.id] = item;
        return acc;
    }, {});
}

function nextId(state: DemoState, prefix: string): string {
    const id = `${prefix}-${state.seq}`;
    state.seq += 1;
    return id;
}

function availableQty(batches: Batch[], itemId: string): number {
    return batches
        .filter(batch => batch.itemId === itemId)
        .reduce((sum, batch) => sum + batch.remaining, 0);
}

function consumeByFifo(
    state: DemoState,
    itemId: string,
    requiredQty: number,
): Array<{ batchId: string; qty: number }> {
    const candidates = state.batches
        .filter(batch => batch.itemId === itemId && batch.remaining > 0)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    let pending = requiredQty;
    const allocations: Array<{ batchId: string; qty: number }> = [];

    for (const batch of candidates) {
        if (pending <= 0) {
            break;
        }
        const taken = Math.min(batch.remaining, pending);
        if (taken > 0) {
            batch.remaining -= taken;
            pending -= taken;
            allocations.push({ batchId: batch.id, qty: taken });
        }
    }

    if (pending > 0) {
        throw new Error(
            `Insufficient stock for ${itemId}. Missing ${pending.toFixed(2)}.`,
        );
    }
    return allocations;
}

function useDemoState() {
    const [state, setState] = useState<DemoState>(() => loadState());

    const save = (next: DemoState) => {
        setState(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    };

    return { state, save };
}

const kindLabels: Record<ItemKind, string> = {
    RAW: "Raw",
    PACKING: "Packing",
    BULK_INHOUSE: "Bulk (In-House)",
    BULK_THIRD_PARTY: "Bulk (3rd Party)",
    FINISHED: "Finished Goods",
};

interface ProcurementValues {
    itemId: string;
    supplier: string;
    qty: number;
    unitCost: number;
    lotId: string;
}

interface ProductionValues {
    outputQty: number;
    wastageQty: number;
    chiliQty: number;
    corianderQty: number;
}

interface PackingValues {
    sourceItemId: string;
    sourceBatchId: string;
    goodUnits: number;
    damagedUnits: number;
}

interface DispatchValues {
    customer: string;
    quantity: number;
}

interface ReturnValues {
    dispatchId: string;
    quantity: number;
    condition: ReturnCondition;
}

function DemoApp() {
    const { state, save } = useDemoState();
    const [api, contextHolder] = message.useMessage();
    const [procurementForm] = Form.useForm<ProcurementValues>();
    const [productionForm] = Form.useForm<ProductionValues>();
    const [packingForm] = Form.useForm<PackingValues>();
    const [dispatchForm] = Form.useForm<DispatchValues>();
    const [returnsForm] = Form.useForm<ReturnValues>();
    const itemsById = useMemo(() => getItemMap(state.items), [state.items]);

    const stockRows = useMemo(
        () =>
            state.items.map(item => ({
                key: item.id,
                item: item.name,
                kind: kindLabels[item.kind],
                qty: Number(availableQty(state.batches, item.id).toFixed(2)),
                unit: item.unit,
                reorderLevel: item.reorderLevel,
            })),
        [state.batches, state.items],
    );

    const lowStock = stockRows.filter(row => row.qty < row.reorderLevel);
    const totalRawKg = Number(
        availableQty(state.batches, "raw_chili").toFixed(2),
    ) + Number(availableQty(state.batches, "raw_coriander").toFixed(2));

    const addLedger = (
        draft: DemoState,
        type: LedgerEntry["type"],
        notes: string,
        lines: LedgerLine[],
    ) => {
        draft.ledger.unshift({
            id: nextId(draft, "led"),
            at: nowIso(),
            type,
            notes,
            lines,
        });
    };

    const loadExampleScenario = () => {
        const draft = createEmptyState();
        const pushBatch = (
            itemId: string,
            lotId: string,
            qty: number,
            unitCost: number,
            source: string,
            sourceBatchId?: string,
        ) => {
            const batch: Batch = {
                id: nextId(draft, "bat"),
                itemId,
                lotId,
                source,
                sourceBatchId,
                qty,
                remaining: qty,
                unitCost,
                createdAt: nowIso(),
            };
            draft.batches.push(batch);
            return batch;
        };

        const chili = pushBatch("raw_chili", "LOT-RAW-001", 120, 160, "supplier");
        const coriander = pushBatch(
            "raw_coriander",
            "LOT-RAW-002",
            80,
            120,
            "supplier",
        );
        const pouch = pushBatch(
            "pack_pouch_100",
            "LOT-PACK-001",
            6000,
            1.2,
            "supplier",
        );
        const bulkThird = pushBatch(
            "bulk_garam_third",
            "LOT-3P-001",
            50,
            220,
            "third-party",
        );
        addLedger(draft, "GRN", "Loaded sample procurement", [
            { itemId: chili.itemId, deltaQty: chili.qty, batchId: chili.id },
            {
                itemId: coriander.itemId,
                deltaQty: coriander.qty,
                batchId: coriander.id,
            },
            { itemId: pouch.itemId, deltaQty: pouch.qty, batchId: pouch.id },
            {
                itemId: bulkThird.itemId,
                deltaQty: bulkThird.qty,
                batchId: bulkThird.id,
            },
        ]);
        save(draft);
        api.success("Example scenario loaded.");
    };

    const resetDemo = () => {
        const fresh = createEmptyState();
        save(fresh);
        api.success("Demo reset to clean state.");
    };

    const onProcurement = (values: ProcurementValues) => {
        try {
            const draft: DemoState = structuredClone(state);
            const batch: Batch = {
                id: nextId(draft, "bat"),
                itemId: values.itemId,
                lotId: values.lotId.trim(),
                source: values.supplier.trim(),
                qty: values.qty,
                remaining: values.qty,
                unitCost: values.unitCost,
                createdAt: nowIso(),
            };
            draft.batches.push(batch);
            addLedger(
                draft,
                "GRN",
                `${itemsById[values.itemId]?.name ?? values.itemId} received`,
                [{ itemId: values.itemId, deltaQty: values.qty, batchId: batch.id }],
            );
            save(draft);
            procurementForm.resetFields(["qty", "unitCost", "lotId"]);
            api.success("GRN recorded.");
        } catch (error) {
            api.error((error as Error).message);
        }
    };

    const onProduction = (values: ProductionValues) => {
        try {
            const draft: DemoState = structuredClone(state);
            const chiliAlloc = consumeByFifo(draft, "raw_chili", values.chiliQty);
            const corianderAlloc = consumeByFifo(
                draft,
                "raw_coriander",
                values.corianderQty,
            );
            const producedBatch: Batch = {
                id: nextId(draft, "bat"),
                itemId: "bulk_garam_inhouse",
                lotId: `PROD-${draft.seq}`,
                source: "in-house production",
                qty: values.outputQty,
                remaining: values.outputQty,
                unitCost: 0,
                createdAt: nowIso(),
            };
            draft.batches.push(producedBatch);

            addLedger(
                draft,
                "PRODUCTION",
                `Production run complete. Wastage ${values.wastageQty} KG`,
                [
                    { itemId: "raw_chili", deltaQty: -values.chiliQty },
                    { itemId: "raw_coriander", deltaQty: -values.corianderQty },
                    {
                        itemId: "bulk_garam_inhouse",
                        deltaQty: values.outputQty,
                        batchId: producedBatch.id,
                    },
                ],
            );

            save(draft);
            productionForm.resetFields();
            api.success(
                `Batch ${producedBatch.lotId} created. Consumed ${chiliAlloc.length + corianderAlloc.length} source lots.`,
            );
        } catch (error) {
            api.error((error as Error).message);
        }
    };

    const onPacking = (values: PackingValues) => {
        try {
            const totalUnits = values.goodUnits + values.damagedUnits;
            if (totalUnits <= 0) {
                throw new Error("At least one unit must be packed.");
            }
            const draft: DemoState = structuredClone(state);
            const bulkRequiredKg = Number(((totalUnits * 100) / 1000).toFixed(3));
            consumeByFifo(draft, values.sourceItemId, bulkRequiredKg);
            consumeByFifo(draft, "pack_pouch_100", totalUnits);

            const fgBatch: Batch = {
                id: nextId(draft, "bat"),
                itemId: "fg_garam_100",
                lotId: `FG-${draft.seq}`,
                source: "packing run",
                sourceBatchId: values.sourceBatchId,
                qty: values.goodUnits,
                remaining: values.goodUnits,
                unitCost: 0,
                createdAt: nowIso(),
            };
            draft.batches.push(fgBatch);

            addLedger(
                draft,
                "PACKING",
                `Packing done from ${values.sourceItemId}; damaged ${values.damagedUnits}`,
                [
                    { itemId: values.sourceItemId, deltaQty: -bulkRequiredKg },
                    { itemId: "pack_pouch_100", deltaQty: -totalUnits },
                    {
                        itemId: "fg_garam_100",
                        deltaQty: values.goodUnits,
                        batchId: fgBatch.id,
                    },
                ],
            );

            if (values.damagedUnits > 0) {
                addLedger(draft, "WRITE_OFF", "Damaged pouches during packing", [
                    { itemId: "fg_garam_100", deltaQty: 0 },
                ]);
            }

            save(draft);
            packingForm.resetFields(["goodUnits", "damagedUnits"]);
            api.success(`Packing created FG batch ${fgBatch.lotId}.`);
        } catch (error) {
            api.error((error as Error).message);
        }
    };

    const onDispatch = (values: DispatchValues) => {
        try {
            const draft: DemoState = structuredClone(state);
            const allocations = consumeByFifo(
                draft,
                "fg_garam_100",
                values.quantity,
            );
            const dispatch: DispatchRecord = {
                id: nextId(draft, "dsp"),
                at: nowIso(),
                customer: values.customer.trim(),
                itemId: "fg_garam_100",
                quantity: values.quantity,
                allocations,
            };
            draft.dispatches.unshift(dispatch);
            addLedger(
                draft,
                "DISPATCH",
                `Dispatch to ${dispatch.customer}`,
                [{ itemId: "fg_garam_100", deltaQty: -values.quantity }],
            );
            save(draft);
            dispatchForm.resetFields(["customer", "quantity"]);
            api.success(`Dispatch ${dispatch.id} recorded with FIFO allocation.`);
        } catch (error) {
            api.error((error as Error).message);
        }
    };

    const onReturn = (values: ReturnValues) => {
        try {
            const draft: DemoState = structuredClone(state);
            const dispatch = draft.dispatches.find(d => d.id === values.dispatchId);
            if (!dispatch) {
                throw new Error("Selected dispatch was not found.");
            }
            const alreadyReturned = draft.returns
                .filter(record => record.dispatchId === values.dispatchId)
                .reduce((sum, record) => sum + record.quantity, 0);
            const maxReturnable = dispatch.quantity - alreadyReturned;
            if (values.quantity > maxReturnable) {
                throw new Error(
                    `Only ${maxReturnable} units can be returned from this dispatch.`,
                );
            }
            const record: ReturnRecord = {
                id: nextId(draft, "rtn"),
                at: nowIso(),
                dispatchId: values.dispatchId,
                quantity: values.quantity,
                condition: values.condition,
            };
            draft.returns.unshift(record);

            if (values.condition === "GOOD") {
                const batch: Batch = {
                    id: nextId(draft, "bat"),
                    itemId: "fg_garam_100",
                    lotId: `RET-${draft.seq}`,
                    source: "customer return",
                    sourceBatchId: values.dispatchId,
                    qty: values.quantity,
                    remaining: values.quantity,
                    unitCost: 0,
                    createdAt: nowIso(),
                };
                draft.batches.push(batch);
                addLedger(draft, "RETURN", `Good return from ${dispatch.customer}`, [
                    {
                        itemId: "fg_garam_100",
                        deltaQty: values.quantity,
                        batchId: batch.id,
                    },
                ]);
            } else {
                addLedger(
                    draft,
                    "WRITE_OFF",
                    `Damaged return written off from ${dispatch.customer}`,
                    [{ itemId: "fg_garam_100", deltaQty: 0 }],
                );
            }

            save(draft);
            returnsForm.resetFields(["dispatchId", "quantity", "condition"]);
            api.success("Return processed.");
        } catch (error) {
            api.error((error as Error).message);
        }
    };

    const sourceBulkBatches = state.batches.filter(
        batch =>
            (batch.itemId === "bulk_garam_inhouse" ||
                batch.itemId === "bulk_garam_third") &&
            batch.remaining > 0,
    );

    return (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
            {contextHolder}
            <Alert
                type="info"
                showIcon
                message="Demo Isolation Guarantee"
                description="This demo stores all transactions in browser localStorage only (key: motaba_demo_v1). No DB, no backend API, no project file operations."
            />

            <Space wrap>
                <Button type="primary" onClick={loadExampleScenario}>
                    Load Example Scenario
                </Button>
                <Button danger onClick={resetDemo}>
                    Reset Demo
                </Button>
            </Space>

            <Row gutter={12}>
                <Col xs={24} md={6}>
                    <Card>
                        <Statistic title="Raw Stock (KG)" value={totalRawKg} />
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card>
                        <Statistic
                            title="Bulk In-House (KG)"
                            value={availableQty(state.batches, "bulk_garam_inhouse")}
                        />
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card>
                        <Statistic
                            title="Bulk 3rd Party (KG)"
                            value={availableQty(state.batches, "bulk_garam_third")}
                        />
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card>
                        <Statistic
                            title="Finished Goods (PCS)"
                            value={availableQty(state.batches, "fg_garam_100")}
                        />
                    </Card>
                </Col>
            </Row>

            {lowStock.length > 0 ? (
                <Alert
                    type="warning"
                    showIcon
                    message="Re-order alerts"
                    description={lowStock
                        .map(
                            row =>
                                `${row.item}: ${row.qty} ${row.unit} (min ${row.reorderLevel})`,
                        )
                        .join(" | ")}
                />
            ) : null}

            <Collapse
                items={[
                    {
                        key: "procurement",
                        label: "1) Procurement / GRN",
                        children: (
                            <Form
                                layout="vertical"
                                form={procurementForm}
                                onFinish={onProcurement}
                                initialValues={{
                                    itemId: "raw_chili",
                                    supplier: "A1 Spices Supplier",
                                    qty: 100,
                                    unitCost: 150,
                                }}
                            >
                                <Row gutter={12}>
                                    <Col xs={24} md={8}>
                                        <Form.Item
                                            label="Item"
                                            name="itemId"
                                            rules={[{ required: true }]}
                                        >
                                            <Select
                                                options={state.items
                                                    .filter(
                                                        item =>
                                                            item.kind === "RAW" ||
                                                            item.kind === "PACKING" ||
                                                            item.kind ===
                                                                "BULK_THIRD_PARTY",
                                                    )
                                                    .map(item => ({
                                                        label: item.name,
                                                        value: item.id,
                                                    }))}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={8}>
                                        <Form.Item
                                            label="Supplier"
                                            name="supplier"
                                            rules={[{ required: true }]}
                                        >
                                            <Input />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={12} md={4}>
                                        <Form.Item
                                            label="Quantity"
                                            name="qty"
                                            rules={[{ required: true }]}
                                        >
                                            <InputNumber min={0.01} style={{ width: "100%" }} />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={12} md={4}>
                                        <Form.Item
                                            label="Unit Cost"
                                            name="unitCost"
                                            rules={[{ required: true }]}
                                        >
                                            <InputNumber min={0} style={{ width: "100%" }} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Form.Item
                                    label="Lot ID"
                                    name="lotId"
                                    rules={[{ required: true }]}
                                >
                                    <Input placeholder="LOT-RAW-101" />
                                </Form.Item>
                                <Button type="primary" htmlType="submit">
                                    Record GRN
                                </Button>
                            </Form>
                        ),
                    },
                    {
                        key: "production",
                        label: "2) In-House Production (Raw -> Bulk)",
                        children: (
                            <Form
                                layout="vertical"
                                form={productionForm}
                                onFinish={onProduction}
                                initialValues={{
                                    outputQty: 95,
                                    wastageQty: 5,
                                    chiliQty: 60,
                                    corianderQty: 40,
                                }}
                            >
                                <Alert
                                    type="info"
                                    showIcon
                                    message="Recipe reference for Garam Masala"
                                    description="Chili Raw 60% + Coriander Raw 40%. Enter actual consumed qty."
                                />
                                <Row gutter={12} style={{ marginTop: 8 }}>
                                    <Col xs={24} md={6}>
                                        <Form.Item
                                            label="Chili Consumed (KG)"
                                            name="chiliQty"
                                            rules={[{ required: true }]}
                                        >
                                            <InputNumber min={0.01} style={{ width: "100%" }} />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={6}>
                                        <Form.Item
                                            label="Coriander Consumed (KG)"
                                            name="corianderQty"
                                            rules={[{ required: true }]}
                                        >
                                            <InputNumber min={0.01} style={{ width: "100%" }} />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={6}>
                                        <Form.Item
                                            label="Bulk Output (KG)"
                                            name="outputQty"
                                            rules={[{ required: true }]}
                                        >
                                            <InputNumber min={0.01} style={{ width: "100%" }} />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={6}>
                                        <Form.Item
                                            label="Wastage (KG)"
                                            name="wastageQty"
                                            rules={[{ required: true }]}
                                        >
                                            <InputNumber min={0} style={{ width: "100%" }} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Button type="primary" htmlType="submit">
                                    Complete Production Batch
                                </Button>
                            </Form>
                        ),
                    },
                    {
                        key: "packing",
                        label: "3) Packing (Bulk -> FG 100g)",
                        children: (
                            <Form
                                layout="vertical"
                                form={packingForm}
                                onFinish={onPacking}
                                initialValues={{
                                    sourceItemId: "bulk_garam_inhouse",
                                    goodUnits: 500,
                                    damagedUnits: 10,
                                }}
                            >
                                <Row gutter={12}>
                                    <Col xs={24} md={8}>
                                        <Form.Item
                                            label="Source Bulk Type"
                                            name="sourceItemId"
                                            rules={[{ required: true }]}
                                        >
                                            <Select
                                                options={[
                                                    {
                                                        label: "In-House Bulk",
                                                        value: "bulk_garam_inhouse",
                                                    },
                                                    {
                                                        label: "3rd Party Bulk",
                                                        value: "bulk_garam_third",
                                                    },
                                                ]}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={8}>
                                        <Form.Item
                                            label="Source Batch (reference)"
                                            name="sourceBatchId"
                                            rules={[{ required: true }]}
                                        >
                                            <Select
                                                options={sourceBulkBatches.map(batch => ({
                                                    label: `${batch.lotId} (${batch.remaining.toFixed(2)} KG)`,
                                                    value: batch.id,
                                                }))}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={12} md={4}>
                                        <Form.Item
                                            label="Good Units"
                                            name="goodUnits"
                                            rules={[{ required: true }]}
                                        >
                                            <InputNumber min={0} style={{ width: "100%" }} />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={12} md={4}>
                                        <Form.Item
                                            label="Damaged Units"
                                            name="damagedUnits"
                                            rules={[{ required: true }]}
                                        >
                                            <InputNumber min={0} style={{ width: "100%" }} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Button type="primary" htmlType="submit">
                                    Execute Packing Run
                                </Button>
                            </Form>
                        ),
                    },
                    {
                        key: "dispatch",
                        label: "4) Dispatch (FIFO Finished Goods)",
                        children: (
                            <Form
                                layout="vertical"
                                form={dispatchForm}
                                onFinish={onDispatch}
                                initialValues={{
                                    customer: "Shree Traders",
                                    quantity: 120,
                                }}
                            >
                                <Row gutter={12}>
                                    <Col xs={24} md={12}>
                                        <Form.Item
                                            label="Customer / Channel"
                                            name="customer"
                                            rules={[{ required: true }]}
                                        >
                                            <Input />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={6}>
                                        <Form.Item
                                            label="Dispatch Qty (PCS)"
                                            name="quantity"
                                            rules={[{ required: true }]}
                                        >
                                            <InputNumber min={1} style={{ width: "100%" }} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Button type="primary" htmlType="submit">
                                    Create Dispatch Note
                                </Button>
                            </Form>
                        ),
                    },
                    {
                        key: "returns",
                        label: "5) Sales Returns",
                        children: (
                            <Form
                                layout="vertical"
                                form={returnsForm}
                                onFinish={onReturn}
                                initialValues={{ condition: "GOOD" }}
                            >
                                <Row gutter={12}>
                                    <Col xs={24} md={8}>
                                        <Form.Item
                                            label="Dispatch"
                                            name="dispatchId"
                                            rules={[{ required: true }]}
                                        >
                                            <Select
                                                options={state.dispatches.map(dispatch => ({
                                                    label: `${dispatch.id} - ${dispatch.customer} (${dispatch.quantity})`,
                                                    value: dispatch.id,
                                                }))}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={4}>
                                        <Form.Item
                                            label="Qty"
                                            name="quantity"
                                            rules={[{ required: true }]}
                                        >
                                            <InputNumber min={1} style={{ width: "100%" }} />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={6}>
                                        <Form.Item
                                            label="Condition"
                                            name="condition"
                                            rules={[{ required: true }]}
                                        >
                                            <Select
                                                options={[
                                                    { label: "Good (add back)", value: "GOOD" },
                                                    {
                                                        label: "Damaged (write-off)",
                                                        value: "DAMAGED",
                                                    },
                                                ]}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Button type="primary" htmlType="submit">
                                    Process Return
                                </Button>
                            </Form>
                        ),
                    },
                ]}
            />

            <Card title="Current Stock Snapshot">
                <Table
                    rowKey="key"
                    pagination={false}
                    dataSource={stockRows}
                    columns={[
                        { title: "Item", dataIndex: "item" },
                        { title: "Type", dataIndex: "kind" },
                        {
                            title: "Available",
                            render: (_, row) => `${row.qty} ${row.unit}`,
                        },
                        {
                            title: "Status",
                            render: (_, row) =>
                                row.qty < row.reorderLevel ? (
                                    <Tag color="red">Low Stock</Tag>
                                ) : (
                                    <Tag color="green">OK</Tag>
                                ),
                        },
                    ]}
                />
            </Card>

            <Card title="Recent Dispatches">
                <Table
                    rowKey="id"
                    pagination={false}
                    dataSource={state.dispatches}
                    locale={{ emptyText: "No dispatches yet." }}
                    columns={[
                        { title: "Dispatch ID", dataIndex: "id" },
                        { title: "Customer", dataIndex: "customer" },
                        { title: "Qty", dataIndex: "quantity" },
                        {
                            title: "FIFO Batches Used",
                            render: (_, row) =>
                                row.allocations
                                    .map(
                                        (allocation: { batchId: string; qty: number }) =>
                                            `${allocation.batchId} (${allocation.qty})`,
                                    )
                                    .join(", "),
                        },
                    ]}
                />
            </Card>

            <Card title="Stock Ledger (Latest First)">
                <Table
                    rowKey="id"
                    pagination={false}
                    dataSource={state.ledger}
                    columns={[
                        {
                            title: "Time",
                            dataIndex: "at",
                            render: (value: string) =>
                                new Date(value).toLocaleString(),
                        },
                        { title: "Type", dataIndex: "type" },
                        { title: "Notes", dataIndex: "notes" },
                        {
                            title: "Lines",
                            render: (_, row) =>
                                row.lines
                                    .map((line: LedgerLine) => {
                                        const item = itemsById[line.itemId];
                                        return `${item?.name ?? line.itemId}: ${line.deltaQty > 0 ? "+" : ""}${line.deltaQty}`;
                                    })
                                    .join(" | "),
                        },
                    ]}
                />
            </Card>

            <Card title="Demo Boundaries">
                <Descriptions column={1} size="small">
                    <Descriptions.Item label="Data Store">
                        Browser localStorage only
                    </Descriptions.Item>
                    <Descriptions.Item label="Persistence Key">
                        <code>{STORAGE_KEY}</code>
                    </Descriptions.Item>
                    <Descriptions.Item label="No Production Interaction">
                        No DB calls, no backend API calls, no file operations
                    </Descriptions.Item>
                </Descriptions>
                <Text type="secondary">
                    This is intentionally isolated for safe demo experimentation.
                </Text>
            </Card>
        </Space>
    );
}

export default DemoApp;
