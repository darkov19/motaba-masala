import { Alert, Button, Form, InputNumber, Select, Space, Typography, message } from "antd";
import TextArea from "antd/es/input/TextArea";
import { useCallback, useEffect, useState } from "react";
import {
    REASON_CODES,
    type ReasonCode,
    type ItemMaster,
    type MaterialLot,
    createStockAdjustment,
    listItems,
    listMaterialLots,
} from "../../services/masterDataApi";

type StockReconciliationPageProps = {
    onDirtyChange: (isDirty: boolean) => void;
};

type FormValues = {
    item_id: number | null;
    lot_id: number | null;
    qty_delta: number | null;
    reason_code: ReasonCode | null;
    notes: string;
};

const INITIAL_VALUES: FormValues = {
    item_id: null,
    lot_id: null,
    qty_delta: null,
    reason_code: null,
    notes: "",
};

export function StockReconciliationPage({ onDirtyChange }: StockReconciliationPageProps) {
    const [form] = Form.useForm<FormValues>();
    const [items, setItems] = useState<ItemMaster[]>([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [lots, setLots] = useState<MaterialLot[]>([]);
    const [lotsLoading, setLotsLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        onDirtyChange(false);
    }, [onDirtyChange]);

    useEffect(() => {
        let mounted = true;
        const loadItems = async () => {
            setItemsLoading(true);
            try {
                const nextItems = await listItems(true);
                if (mounted) {
                    setItems(nextItems);
                }
            } catch (raw) {
                if (mounted) {
                    message.warning(raw instanceof Error ? raw.message : "Failed to load items");
                }
            } finally {
                if (mounted) {
                    setItemsLoading(false);
                }
            }
        };
        void loadItems();
        return () => {
            mounted = false;
        };
    }, []);

    const loadLotsForItem = useCallback(async (itemId: number) => {
        setLotsLoading(true);
        setLots([]);
        try {
            const nextLots = await listMaterialLots({ activeOnly: true, itemId });
            setLots(nextLots);
        } catch {
            setLots([]);
        } finally {
            setLotsLoading(false);
        }
    }, []);

    const onItemChange = useCallback((itemId: number | null) => {
        form.setFieldValue("lot_id", null);
        setLots([]);
        if (itemId != null) {
            void loadLotsForItem(itemId);
        }
        onDirtyChange(true);
    }, [form, loadLotsForItem, onDirtyChange]);

    const onValuesChange = useCallback(() => {
        onDirtyChange(true);
    }, [onDirtyChange]);

    const onFinish = useCallback(async (values: FormValues) => {
        setSubmitting(true);
        setSubmitError(null);
        try {
            await createStockAdjustment({
                item_id: values.item_id!,
                lot_id: values.lot_id ?? null,
                qty_delta: values.qty_delta!,
                reason_code: values.reason_code!,
                notes: values.notes?.trim() || undefined,
            });
            message.success("Stock adjustment recorded successfully.");
            form.resetFields();
            setLots([]);
            onDirtyChange(false);
        } catch (raw) {
            const detail = raw instanceof Error ? raw.message : "Failed to record adjustment";
            setSubmitError(detail);
        } finally {
            setSubmitting(false);
        }
    }, [form, onDirtyChange]);

    const onReset = useCallback(() => {
        form.resetFields();
        setLots([]);
        setSubmitError(null);
        onDirtyChange(false);
    }, [form, onDirtyChange]);

    return (
        <Space orientation="vertical" size={16} style={{ width: "100%", maxWidth: 640 }}>
            <Typography.Title level={5} style={{ margin: 0 }}>
                Stock Reconciliation Entry
            </Typography.Title>
            <Typography.Text type="secondary">
                Record a manual stock adjustment with a mandatory reason code. All entries are permanent and append-only.
            </Typography.Text>

            <Form
                form={form}
                layout="vertical"
                initialValues={INITIAL_VALUES}
                onFinish={onFinish}
                onValuesChange={onValuesChange}
                style={{ width: "100%" }}
            >
                <Form.Item
                    label="Item"
                    name="item_id"
                    rules={[{ required: true, message: "Please select an item" }]}
                >
                    <Select
                        showSearch
                        allowClear
                        loading={itemsLoading}
                        optionFilterProp="label"
                        placeholder="Select an item..."
                        options={items.map(item => ({
                            value: item.id,
                            label: `${item.name} [${item.item_type}] (#${item.id})`,
                        }))}
                        onChange={onItemChange}
                    />
                </Form.Item>

                <Form.Item
                    label="Lot (optional)"
                    name="lot_id"
                >
                    <Select
                        showSearch
                        allowClear
                        loading={lotsLoading}
                        optionFilterProp="label"
                        placeholder="Any lot (leave blank for item-level adjustment)"
                        options={lots.map(lot => ({
                            value: lot.id,
                            label: `${lot.lot_number} (qty: ${lot.quantity_received})`,
                        }))}
                        disabled={!form.getFieldValue("item_id")}
                    />
                </Form.Item>

                <Form.Item
                    label="Quantity Delta"
                    name="qty_delta"
                    rules={[
                        { required: true, message: "Please enter a quantity delta" },
                        {
                            validator: (_, value: number | null) => {
                                if (value === 0) {
                                    return Promise.reject(new Error("Quantity delta must be non-zero"));
                                }
                                return Promise.resolve();
                            },
                        },
                    ]}
                >
                    <InputNumber
                        style={{ width: "100%" }}
                        placeholder="Positive for gain, negative for loss (e.g. -5, +10)"
                        step={1}
                        precision={2}
                    />
                </Form.Item>

                <Form.Item
                    label="Reason Code"
                    name="reason_code"
                    rules={[{ required: true, message: "Please select a reason code" }]}
                >
                    <Select
                        placeholder="Select reason..."
                        options={REASON_CODES.map(code => ({ value: code, label: code }))}
                    />
                </Form.Item>

                <Form.Item
                    label="Notes (optional)"
                    name="notes"
                >
                    <TextArea
                        rows={3}
                        placeholder="Additional context for this adjustment..."
                        maxLength={500}
                    />
                </Form.Item>

                {submitError ? (
                    <Form.Item>
                        <Alert
                            showIcon
                            type="error"
                            message="Submission failed"
                            description={submitError}
                        />
                    </Form.Item>
                ) : null}

                <Form.Item>
                    <Space>
                        <Button type="primary" htmlType="submit" loading={submitting}>
                            Record Adjustment
                        </Button>
                        <Button htmlType="button" onClick={onReset} disabled={submitting}>
                            Reset
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </Space>
    );
}
