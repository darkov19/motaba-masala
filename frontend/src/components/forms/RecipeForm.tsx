import { Alert, Button, Form, Input, InputNumber, Select, Space, Table, Tag, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
    createRecipe,
    ItemMaster,
    listItems,
    listRecipes,
    Recipe,
    updateRecipe,
} from "../../services/masterDataApi";

type RecipeFormValues = {
    recipe_code: string;
    output_item_id?: number;
    output_qty_base?: number | null;
    expected_wastage_pct?: number | null;
    is_active?: boolean;
    updated_at?: string;
    components: Array<{
        input_item_id?: number;
        input_qty_base?: number | null;
    }>;
};

type RecipeFormProps = {
    onDirtyChange: (dirty: boolean) => void;
    writeDisabled?: boolean;
    readOnly?: boolean;
};

export function RecipeForm({ onDirtyChange, writeDisabled = false, readOnly = false }: RecipeFormProps) {
    const [form] = Form.useForm<RecipeFormValues>();
    const watched = Form.useWatch([], form);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [outputItems, setOutputItems] = useState<ItemMaster[]>([]);
    const [inputItems, setInputItems] = useState<ItemMaster[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);

    const outputLabelByID = useMemo(() => {
        const map = new Map<number, string>();
        for (const item of outputItems) {
            map.set(item.id, item.name);
        }
        return map;
    }, [outputItems]);

    const inputLabelByID = useMemo(() => {
        const map = new Map<number, string>();
        for (const item of inputItems) {
            map.set(item.id, item.name);
        }
        return map;
    }, [inputItems]);

    const hasContent = useMemo(() => {
        if (!watched) {
            return false;
        }
        if (typeof watched.recipe_code === "string" && watched.recipe_code.trim() !== "") {
            return true;
        }
        if (Number(watched.output_item_id || 0) > 0) {
            return true;
        }
        if (Number(watched.output_qty_base || 0) > 0) {
            return true;
        }
        if (Number(watched.expected_wastage_pct || 0) > 0) {
            return true;
        }
        if (!Array.isArray(watched.components)) {
            return false;
        }
        const [first] = watched.components;
        if (!first) {
            return false;
        }
        if (Number(first.input_item_id || 0) > 0) {
            return true;
        }
        return Number(first.input_qty_base || 0) > 0;
    }, [watched]);

    useEffect(() => {
        if (readOnly) {
            onDirtyChange(false);
            return;
        }
        onDirtyChange(hasContent);
    }, [hasContent, onDirtyChange, readOnly]);

    const load = async () => {
        setLoading(true);
        try {
            const [bulkItems, rawItems, recipeRows] = await Promise.all([
                listItems(true, "BULK_POWDER"),
                listItems(true, "RAW"),
                listRecipes({ activeOnly: true }),
            ]);
            setOutputItems(bulkItems);
            setInputItems(rawItems);
            setRecipes(recipeRows);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "Failed to load recipe data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const reset = () => {
        form.resetFields();
        form.setFieldsValue({ is_active: true, expected_wastage_pct: 0, components: [{ input_qty_base: 0 }] });
        setEditingId(null);
        onDirtyChange(false);
    };

    const onFinish = async (values: RecipeFormValues) => {
        setSubmitting(true);
        try {
            const normalizedComponents = (values.components || []).map((component, index) => ({
                input_item_id: Number(component.input_item_id),
                input_qty_base: Number(component.input_qty_base),
                line_no: index + 1,
            }));

            if (normalizedComponents.length === 0) {
                message.error("At least one component is required");
                return;
            }
            if (normalizedComponents.some(component => !Number.isFinite(component.input_qty_base) || component.input_qty_base <= 0)) {
                message.error("Each component quantity must be greater than zero");
                return;
            }
            const selectedIDs = normalizedComponents.map(component => component.input_item_id).filter(id => Number.isFinite(id) && id > 0);
            const uniqueIDs = new Set(selectedIDs);
            if (selectedIDs.length !== uniqueIDs.size) {
                message.error("Duplicate component items are not allowed");
                return;
            }

            if (editingId && values.updated_at) {
                await updateRecipe({
                    id: editingId,
                    recipe_code: values.recipe_code,
                    output_item_id: Number(values.output_item_id),
                    output_qty_base: Number(values.output_qty_base),
                    expected_wastage_pct: Number(values.expected_wastage_pct ?? 0),
                    is_active: values.is_active ?? true,
                    updated_at: values.updated_at,
                    components: normalizedComponents,
                });
                message.success("Recipe updated");
            } else {
                await createRecipe({
                    recipe_code: values.recipe_code,
                    output_item_id: Number(values.output_item_id),
                    output_qty_base: Number(values.output_qty_base),
                    expected_wastage_pct: Number(values.expected_wastage_pct ?? 0),
                    is_active: values.is_active ?? true,
                    components: normalizedComponents,
                });
                message.success("Recipe created");
            }

            reset();
            await load();
        } catch (error) {
            message.error(error instanceof Error ? error.message : "Failed to save recipe");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            {readOnly ? (
                <Alert
                    type="info"
                    showIcon
                    title="Read-only access"
                    description="Your role can view recipes, but cannot create or edit them."
                />
            ) : null}
            <div className={`recipe-master-split${readOnly ? " recipe-master-split--readonly" : ""}`}>
                <div className="recipe-master-split__table">
                    <Table<Recipe>
                        rowKey="id"
                        loading={loading}
                        dataSource={recipes}
                        pagination={{ pageSize: 8 }}
                        columns={[
                            { title: "Recipe Code", dataIndex: "recipe_code" },
                            {
                                title: "Output Item",
                                dataIndex: "output_item_id",
                                render: value => outputLabelByID.get(value) || `Item #${value}`,
                            },
                            { title: "Output Qty", dataIndex: "output_qty_base" },
                            { title: "Wastage %", dataIndex: "expected_wastage_pct" },
                            {
                                title: "Components",
                                key: "components",
                                render: (_, row) => (
                                    <Space wrap size={[4, 4]}>
                                        {row.components.slice(0, 2).map(component => (
                                            <Tag key={`${row.id}-${component.line_no}`}>
                                                {(inputLabelByID.get(component.input_item_id) || `Item #${component.input_item_id}`)} x{component.input_qty_base}
                                            </Tag>
                                        ))}
                                        {row.components.length > 2 ? <Tag>+{row.components.length - 2} more</Tag> : null}
                                    </Space>
                                ),
                            },
                            ...(readOnly
                                ? []
                                : [{
                                    title: "Actions",
                                    key: "actions",
                                    render: (_: unknown, row: Recipe) => (
                                        <Button
                                            size="small"
                                            onClick={() => {
                                                setEditingId(row.id);
                                                form.setFieldsValue({
                                                    recipe_code: row.recipe_code,
                                                    output_item_id: row.output_item_id,
                                                    output_qty_base: row.output_qty_base,
                                                    expected_wastage_pct: row.expected_wastage_pct,
                                                    is_active: row.is_active,
                                                    updated_at: row.updated_at,
                                                    components: row.components.map(component => ({
                                                        input_item_id: component.input_item_id,
                                                        input_qty_base: component.input_qty_base,
                                                    })),
                                                });
                                                onDirtyChange(true);
                                            }}
                                            disabled={writeDisabled}
                                        >
                                            Edit
                                        </Button>
                                    ),
                                }]),
                        ]}
                    />
                </div>

                {!readOnly ? (
                    <div className="recipe-master-split__form">
                        <Form
                            form={form}
                            layout="vertical"
                            initialValues={{ is_active: true, expected_wastage_pct: 0, components: [{ input_qty_base: 0 }] }}
                            onFinish={onFinish}
                        >
                            <Space style={{ width: "100%" }} size={12} wrap>
                                <Form.Item
                                    style={{ minWidth: 220, flex: 1 }}
                                    label="Recipe Code"
                                    name="recipe_code"
                                    rules={[{ required: true, message: "Recipe code is required" }]}
                                >
                                    <Input autoFocus placeholder="RCP-GM-001" />
                                </Form.Item>
                                <Form.Item
                                    style={{ minWidth: 220, flex: 1 }}
                                    label="Output Item"
                                    name="output_item_id"
                                    rules={[{ required: true, message: "Output item is required" }]}
                                >
                                    <Select
                                        placeholder="Select BULK_POWDER item"
                                        options={outputItems.map(item => ({ label: item.name, value: item.id }))}
                                        showSearch
                                        optionFilterProp="label"
                                    />
                                </Form.Item>
                            </Space>

                            <Space style={{ width: "100%" }} size={12} wrap>
                                <Form.Item
                                    style={{ minWidth: 220, flex: 1 }}
                                    label="Output Qty (Base)"
                                    name="output_qty_base"
                                    rules={[{ required: true, message: "Output quantity is required" }]}
                                >
                                    <InputNumber min={0.0001} step={0.1} style={{ width: "100%" }} />
                                </Form.Item>
                                <Form.Item style={{ minWidth: 220, flex: 1 }} label="Expected Wastage %" name="expected_wastage_pct">
                                    <InputNumber min={0} max={100} step={0.1} style={{ width: "100%" }} />
                                </Form.Item>
                            </Space>

                            <Form.List name="components">
                                {(fields, { add, remove }) => (
                                    <Space orientation="vertical" size={8} style={{ width: "100%" }}>
                                        {fields.map(field => (
                                            <Space key={field.key} align="baseline" wrap style={{ width: "100%" }}>
                                                <Form.Item
                                                    style={{ minWidth: 280, flex: 1 }}
                                                    name={[field.name, "input_item_id"]}
                                                    label={`Input Item #${field.name + 1}`}
                                                    rules={[{ required: true, message: "Select an item" }]}
                                                >
                                                    <Select
                                                        placeholder="Select RAW item"
                                                        options={inputItems.map(item => ({ label: item.name, value: item.id }))}
                                                        showSearch
                                                        optionFilterProp="label"
                                                    />
                                                </Form.Item>
                                                <Form.Item
                                                    style={{ minWidth: 180 }}
                                                    name={[field.name, "input_qty_base"]}
                                                    label="Qty (Base)"
                                                    rules={[{ required: true, message: "Quantity is required" }]}
                                                >
                                                    <InputNumber min={0.0001} step={0.1} style={{ width: "100%" }} />
                                                </Form.Item>
                                                <Button danger onClick={() => remove(field.name)} disabled={writeDisabled}>
                                                    Remove
                                                </Button>
                                            </Space>
                                        ))}
                                        <Button onClick={() => add({ input_qty_base: 0 })} disabled={writeDisabled}>
                                            Add Component
                                        </Button>
                                    </Space>
                                )}
                            </Form.List>

                            <Form.Item name="is_active" hidden>
                                <Input />
                            </Form.Item>
                            <Form.Item name="updated_at" hidden>
                                <Input />
                            </Form.Item>

                            <Space>
                                <Button type="primary" htmlType="submit" loading={submitting} disabled={writeDisabled}>
                                    {editingId ? "Update Recipe" : "Create Recipe"}
                                </Button>
                                <Button onClick={reset} disabled={writeDisabled || submitting}>
                                    Reset
                                </Button>
                            </Space>
                        </Form>
                    </div>
                ) : null}
            </div>
        </Space>
    );
}

