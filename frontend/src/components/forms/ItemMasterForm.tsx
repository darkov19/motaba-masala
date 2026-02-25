import { Button, Form, Input, InputNumber, Select, Space, Switch, Table, Tag, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { createItem, ItemMaster, listItems, updateItem } from "../../services/masterDataApi";

type ItemMasterFormValues = {
    id?: number;
    sku?: string;
    name: string;
    item_type: ItemMaster["item_type"];
    base_unit: string;
    item_subtype?: string;
    minimum_stock?: number;
    is_active?: boolean;
    updated_at?: string;
};

type ItemMasterFormProps = {
    onDirtyChange: (dirty: boolean) => void;
    writeDisabled?: boolean;
};

const itemTypeOptions = [
    { label: "RAW", value: "RAW" },
    { label: "BULK_POWDER", value: "BULK_POWDER" },
    { label: "PACKING_MATERIAL", value: "PACKING_MATERIAL" },
    { label: "FINISHED_GOOD", value: "FINISHED_GOOD" },
] as const;

export function ItemMasterForm({ onDirtyChange, writeDisabled = false }: ItemMasterFormProps) {
    const [form] = Form.useForm<ItemMasterFormValues>();
    const watchedValues = Form.useWatch([], form);
    const [items, setItems] = useState<ItemMaster[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const hasContent = useMemo(() => {
        if (!watchedValues) {
            return false;
        }
        return Object.values(watchedValues).some(value => {
            if (typeof value === "number") {
                return value > 0;
            }
            return typeof value === "string" && value.trim().length > 0;
        });
    }, [watchedValues]);

    useEffect(() => {
        onDirtyChange(hasContent);
    }, [hasContent, onDirtyChange]);

    const refresh = async () => {
        setLoading(true);
        try {
            const rows = await listItems(true);
            setItems(rows);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "Failed to load items");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void refresh();
    }, []);

    const resetForm = () => {
        form.resetFields();
        form.setFieldsValue({ is_active: true, item_type: "RAW", minimum_stock: 0 });
        setEditingId(null);
        onDirtyChange(false);
    };

    const onFinish = async (values: ItemMasterFormValues) => {
        setSubmitting(true);
        try {
            if (editingId && values.updated_at) {
                await updateItem({
                    id: editingId,
                    sku: values.sku,
                    name: values.name,
                    item_type: values.item_type,
                    base_unit: values.base_unit,
                    item_subtype: values.item_subtype,
                    minimum_stock: values.minimum_stock ?? 0,
                    is_active: values.is_active ?? true,
                    updated_at: values.updated_at,
                });
                message.success("Item updated");
            } else {
                await createItem({
                    sku: values.sku,
                    name: values.name,
                    item_type: values.item_type,
                    base_unit: values.base_unit,
                    item_subtype: values.item_subtype,
                    minimum_stock: values.minimum_stock ?? 0,
                    is_active: values.is_active ?? true,
                });
                message.success("Item created");
            }
            resetForm();
            await refresh();
        } catch (error) {
            message.error(error instanceof Error ? error.message : "Failed to save item");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{ is_active: true, item_type: "RAW", minimum_stock: 0 }}
            >
                <Form.Item label="Item Name" name="name" rules={[{ required: true, message: "Item name is required" }]}>
                    <Input autoFocus placeholder="Enter item name" />
                </Form.Item>
                <Form.Item label="Item Code (SKU)" name="sku">
                    <Input placeholder="Optional SKU/code" />
                </Form.Item>
                <Space style={{ width: "100%" }} size={12} wrap>
                    <Form.Item
                        style={{ minWidth: 220, flex: 1 }}
                        label="Item Type"
                        name="item_type"
                        rules={[{ required: true, message: "Item type is required" }]}
                    >
                        <Select options={itemTypeOptions as unknown as { label: string; value: string }[]} />
                    </Form.Item>
                    <Form.Item
                        style={{ minWidth: 220, flex: 1 }}
                        label="Base Unit"
                        name="base_unit"
                        rules={[{ required: true, message: "Base unit is required" }]}
                    >
                        <Input placeholder="kg, g, pcs, ltr..." />
                    </Form.Item>
                </Space>
                <Form.Item shouldUpdate noStyle>
                    {({ getFieldValue }) =>
                        getFieldValue("item_type") === "PACKING_MATERIAL" ? (
                            <Form.Item label="Subtype Tag" name="item_subtype" rules={[{ required: true, message: "Subtype is required for packing material" }]}>
                                <Input placeholder="JAR_BODY / JAR_LID / CUP_STICKER" />
                            </Form.Item>
                        ) : null
                    }
                </Form.Item>
                <Space style={{ width: "100%" }} size={12} wrap>
                    <Form.Item style={{ minWidth: 220 }} label="Minimum Stock" name="minimum_stock">
                        <InputNumber min={0} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item style={{ minWidth: 220 }} label="Active" name="is_active" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Space>
                <Form.Item name="updated_at" hidden>
                    <Input />
                </Form.Item>
                <Space>
                    <Button type="primary" htmlType="submit" loading={submitting} disabled={writeDisabled}>
                        {editingId ? "Update Item" : "Create Item"}
                    </Button>
                    <Button onClick={resetForm} disabled={writeDisabled || submitting}>
                        Reset
                    </Button>
                </Space>
            </Form>

            <Table<ItemMaster>
                rowKey="id"
                loading={loading}
                dataSource={items}
                pagination={{ pageSize: 8 }}
                columns={[
                    { title: "Name", dataIndex: "name" },
                    { title: "Type", dataIndex: "item_type", render: value => <Tag color="blue">{value}</Tag> },
                    { title: "Base Unit", dataIndex: "base_unit" },
                    { title: "Subtype", dataIndex: "item_subtype" },
                    { title: "SKU", dataIndex: "sku" },
                    {
                        title: "Actions",
                        key: "actions",
                        render: (_, row) => (
                            <Button
                                size="small"
                                onClick={() => {
                                    setEditingId(row.id);
                                    form.setFieldsValue({
                                        id: row.id,
                                        sku: row.sku,
                                        name: row.name,
                                        item_type: row.item_type,
                                        base_unit: row.base_unit,
                                        item_subtype: row.item_subtype,
                                        minimum_stock: row.minimum_stock,
                                        is_active: row.is_active,
                                        updated_at: row.updated_at,
                                    });
                                    onDirtyChange(true);
                                }}
                                disabled={writeDisabled}
                            >
                                Edit
                            </Button>
                        ),
                    },
                ]}
            />
        </Space>
    );
}
