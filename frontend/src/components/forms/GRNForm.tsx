import { Button, Form, Input, InputNumber, Select, Space, Typography, message } from "antd";
import type { InputRef } from "antd";
import { KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAutoSave } from "../../hooks/useAutoSave";
import { createGRN, ItemMaster, Party, listItems, listParties } from "../../services/masterDataApi";

type GRNValues = {
    grnNumber?: string;
    supplierName?: string;
    invoiceNumber?: string;
    notes?: string;
    lines?: Array<{
        item_id?: number;
        quantity_received?: number | null;
    }>;
};

type GRNFormProps = {
    userKey: string;
    onDirtyChange: (isDirty: boolean) => void;
    writeDisabled?: boolean;
    initialValues?: GRNValues;
};

const EMPTY_GRN_VALUES: GRNValues = {};

export function GRNForm({ userKey, onDirtyChange, writeDisabled = false, initialValues }: GRNFormProps) {
    const [form] = Form.useForm<GRNValues>();
    const grnNumberInputRef = useRef<InputRef>(null);
    const watchedValues = Form.useWatch([], form) ?? EMPTY_GRN_VALUES;
    const [items, setItems] = useState<ItemMaster[]>([]);
    const [suppliers, setSuppliers] = useState<Party[]>([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [suppliersLoading, setSuppliersLoading] = useState(false);
    const [latestLotNumbers, setLatestLotNumbers] = useState<string[]>([]);

    const focusGRNNumber = useCallback(() => {
        setTimeout(() => {
            grnNumberInputRef.current?.focus();
        }, 0);
    }, []);

    const hasContent = useMemo(
        () => {
            const baseContent = Object.values(watchedValues).some(value =>
                typeof value === "string" ? value.trim().length > 0 : false,
            );
            if (baseContent) {
                return true;
            }
            const firstLine = watchedValues.lines?.[0];
            if (!firstLine) {
                return false;
            }
            return Number(firstLine.item_id || 0) > 0 || Number(firstLine.quantity_received || 0) > 0;
        },
        [watchedValues],
    );

    useEffect(() => {
        onDirtyChange(hasContent);
    }, [hasContent, onDirtyChange]);

    useEffect(() => {
        focusGRNNumber();
    }, [focusGRNNumber]);

    const { clearDraft } = useAutoSave<GRNValues>(`${userKey}:grn`, watchedValues, {
        enabled: hasContent,
        contextLabel: "GRN",
        shouldSave: value => {
            const baseContent = Object.values(value).some(item =>
                typeof item === "string" ? item.trim().length > 0 : false,
            );
            if (baseContent) {
                return true;
            }
            const firstLine = value.lines?.[0];
            if (!firstLine) {
                return false;
            }
            return Number(firstLine.item_id || 0) > 0 || Number(firstLine.quantity_received || 0) > 0;
        },
        onRestore: value => {
            form.setFieldsValue(value);
            onDirtyChange(true);
        },
        onDiscard: () => {
            onDirtyChange(false);
        },
    });

    useEffect(() => {
        let mounted = true;
        const loadItems = async () => {
            setItemsLoading(true);
            try {
                const [rawItems, packingItems] = await Promise.all([
                    listItems(true, "RAW"),
                    listItems(true, "PACKING_MATERIAL"),
                ]);
                if (!mounted) {
                    return;
                }
                setItems([...rawItems, ...packingItems]);
            } catch (error) {
                message.error(error instanceof Error ? error.message : "Failed to load items for GRN");
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

    useEffect(() => {
        let mounted = true;
        const loadSuppliers = async () => {
            setSuppliersLoading(true);
            try {
                const parties = await listParties({ activeOnly: true, partyType: "SUPPLIER" });
                if (!mounted) {
                    return;
                }
                setSuppliers(parties);
            } catch (error) {
                message.error(error instanceof Error ? error.message : "Failed to load suppliers for GRN");
            } finally {
                if (mounted) {
                    setSuppliersLoading(false);
                }
            }
        };
        void loadSuppliers();
        return () => {
            mounted = false;
        };
    }, []);

    const itemOptions = useMemo(
        () => items.map(item => ({ label: `${item.name} (${item.item_type})`, value: item.id })),
        [items],
    );
    const supplierOptions = useMemo(
        () => suppliers.map(supplier => ({ label: supplier.name, value: supplier.name })),
        [suppliers],
    );
    const resolvedInitialValues = useMemo(
        () => ({ ...initialValues, lines: initialValues?.lines ?? [{ quantity_received: 1 }] }),
        [initialValues],
    );

    const onFinish = async (values: GRNValues) => {
        const supplierName = (values.supplierName || "").trim();
        const lines = (values.lines || []).map((line, index) => ({
            item_id: Number(line.item_id),
            quantity_received: Number(line.quantity_received),
            line_no: index + 1,
        }));
        const supplierExists = suppliers.some(supplier => supplier.name.trim() === supplierName);

        if (lines.length === 0) {
            message.error("At least one GRN line is required");
            return;
        }
        if (!supplierName || !supplierExists) {
            message.error("Select a supplier from the existing list");
            return;
        }
        if (lines.some(line => !Number.isFinite(line.item_id) || line.item_id <= 0)) {
            message.error("Each GRN line must have an item");
            return;
        }
        if (lines.some(line => !Number.isFinite(line.quantity_received) || line.quantity_received <= 0)) {
            message.error("Each GRN line quantity must be greater than zero");
            return;
        }

        try {
            const result = await createGRN({
                grn_number: (values.grnNumber || "").trim(),
                supplier_name: supplierName,
                invoice_no: (values.invoiceNumber || "").trim(),
                notes: (values.notes || "").trim(),
                lines,
            });
            const generatedLots = (result.lines || [])
                .map(line => line.lot_number)
                .filter((lotNumber): lotNumber is string => typeof lotNumber === "string" && lotNumber.trim().length > 0);
            setLatestLotNumbers(generatedLots);
            message.success(`GRN submitted for ${values.supplierName || "supplier"}${generatedLots.length > 0 ? ` with ${generatedLots.length} lot ID(s)` : ""}. Label printing is deferred.`);
            clearDraft();
            form.resetFields();
            form.setFieldsValue({ lines: [{ quantity_received: 1 }] });
            onDirtyChange(false);
            focusGRNNumber();
        } catch (error) {
            message.error(error instanceof Error ? error.message : "Failed to submit GRN");
        }
    };

    const onFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
        if (event.key !== "Enter" || event.shiftKey) {
            return;
        }
        const target = event.target as HTMLElement;
        if (!target) {
            return;
        }
        if (target.tagName === "TEXTAREA" || target.classList.contains("ant-select-selection-search-input")) {
            return;
        }
        event.preventDefault();
        form.submit();
    };

    return (
        <Form
            form={form}
            layout="vertical"
            initialValues={resolvedInitialValues}
            onFinish={onFinish}
            onKeyDown={onFormKeyDown}
        >
            <Form.Item
                label="GRN Number"
                name="grnNumber"
                rules={[{ required: true, message: "GRN number is required" }]}
            >
                <Input ref={grnNumberInputRef} autoFocus placeholder="GRN-3001" disabled={writeDisabled} />
            </Form.Item>
            <Form.Item
                label="Supplier Reference"
                name="supplierName"
                rules={[{ required: true, message: "Supplier reference is required" }]}
            >
                <Select
                    loading={suppliersLoading}
                    disabled={writeDisabled}
                    placeholder="Select supplier"
                    options={supplierOptions}
                    showSearch
                    optionFilterProp="label"
                    onSearch={value => {
                        form.setFieldValue("supplierName", value);
                    }}
                />
            </Form.Item>
            <Form.Item label="Invoice Number" name="invoiceNumber">
                <Input placeholder="INV-3001" disabled={writeDisabled} />
            </Form.Item>
            <Form.Item label="Notes" name="notes">
                <Input.TextArea rows={3} placeholder="Optional notes" disabled={writeDisabled} />
            </Form.Item>
            <Form.List name="lines">
                {(fields, { add, remove }) => (
                    <Space orientation="vertical" size={8} style={{ width: "100%" }}>
                        {fields.map(field => (
                            <Space key={field.key} align="baseline" wrap style={{ width: "100%" }}>
                                <Form.Item
                                    style={{ minWidth: 320, flex: 1 }}
                                    label={`Line #${field.name + 1} Item`}
                                    name={[field.name, "item_id"]}
                                    rules={[{ required: true, message: "Select an item" }]}
                                >
                                    <Select
                                        loading={itemsLoading}
                                        disabled={writeDisabled}
                                        placeholder="Select RAW or PACKING_MATERIAL item"
                                        options={itemOptions}
                                        showSearch
                                        optionFilterProp="label"
                                    />
                                </Form.Item>
                                <Form.Item
                                    style={{ minWidth: 180 }}
                                    label="Qty Received"
                                    name={[field.name, "quantity_received"]}
                                    rules={[{ required: true, message: "Quantity is required" }]}
                                >
                                    <InputNumber
                                        min={0.0001}
                                        step={0.1}
                                        style={{ width: "100%" }}
                                        disabled={writeDisabled}
                                    />
                                </Form.Item>
                                <Button
                                    danger
                                    type="text"
                                    disabled={writeDisabled || fields.length <= 1}
                                    onClick={() => remove(field.name)}
                                >
                                    Remove
                                </Button>
                            </Space>
                        ))}
                        <Button
                            onClick={() => add({ quantity_received: 1 })}
                            disabled={writeDisabled}
                        >
                            Add Line
                        </Button>
                    </Space>
                )}
            </Form.List>
            {latestLotNumbers.length > 0 && (
                <Space orientation="vertical" size={4} style={{ width: "100%", marginBottom: 16 }}>
                    <Typography.Text strong>Generated Lot IDs (copyable)</Typography.Text>
                    {latestLotNumbers.map(lotNumber => (
                        <Typography.Text key={lotNumber} copyable={{ text: lotNumber }} code>
                            {lotNumber}
                        </Typography.Text>
                    ))}
                    <Typography.Text type="secondary">
                        Lot labels are deferred in this release. Use these IDs for traceability.
                    </Typography.Text>
                </Space>
            )}
            <Space>
                <Button type="primary" htmlType="submit" disabled={writeDisabled}>
                    Submit GRN
                </Button>
                <Button
                    disabled={writeDisabled}
                    onClick={() => {
                        form.resetFields();
                        form.setFieldsValue({ lines: [{ quantity_received: 1 }] });
                        clearDraft();
                        onDirtyChange(false);
                        focusGRNNumber();
                    }}
                >
                    Reset
                </Button>
            </Space>
        </Form>
    );
}
