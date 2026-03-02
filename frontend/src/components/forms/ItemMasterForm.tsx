import {
    Alert,
    Button,
    Form,
    Input,
    InputNumber,
    Segmented,
    Space,
    Switch,
    Table,
    message,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    createItem,
    ItemMaster,
    listItems,
    updateItem,
} from "../../services/masterDataApi";

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
    readOnly?: boolean;
};

const typeViews: Array<{ label: string; value: ItemMaster["item_type"] }> = [
    { label: "Raw Master", value: "RAW" },
    { label: "Bulk Powder Master", value: "BULK_POWDER" },
    { label: "Packing Material Items", value: "PACKING_MATERIAL" },
    { label: "Finished Goods Master", value: "FINISHED_GOOD" },
];

const typeTitles: Record<ItemMaster["item_type"], string> = {
    RAW: "Raw Item Master",
    BULK_POWDER: "Bulk Powder Master",
    PACKING_MATERIAL: "Packing Material Items",
    FINISHED_GOOD: "Finished Goods Master",
};

export function ItemMasterForm({
    onDirtyChange,
    writeDisabled = false,
    readOnly = false,
}: ItemMasterFormProps) {
    const navigate = useNavigate();
    const [form] = Form.useForm<ItemMasterFormValues>();
    const watchedValues = Form.useWatch([], form);
    const [activeType, setActiveType] =
        useState<ItemMaster["item_type"]>("RAW");
    const [items, setItems] = useState<ItemMaster[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const hasContent = useMemo(() => {
        if (!watchedValues) {
            return false;
        }
        const candidateValues = {
            ...watchedValues,
            item_type: undefined,
            is_active: undefined,
            id: undefined,
            updated_at: undefined,
        };
        return Object.values(candidateValues).some(value => {
            if (typeof value === "number") {
                return value > 0;
            }
            return typeof value === "string" && value.trim().length > 0;
        });
    }, [watchedValues]);

    useEffect(() => {
        if (readOnly) {
            onDirtyChange(false);
            return;
        }
        onDirtyChange(hasContent);
    }, [hasContent, onDirtyChange, readOnly]);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const rows = await listItems(true, activeType);
            setItems(rows);
        } catch (error) {
            message.error(
                error instanceof Error ? error.message : "Failed to load items",
            );
        } finally {
            setLoading(false);
        }
    }, [activeType]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const resetForm = () => {
        form.resetFields();
        form.setFieldsValue({
            is_active: true,
            item_type: activeType,
            minimum_stock: 0,
        });
        setEditingId(null);
        onDirtyChange(false);
    };

    const onFinish = async (values: ItemMasterFormValues) => {
        setSubmitting(true);
        const itemType = values.item_type || activeType;
        try {
            if (editingId && values.updated_at) {
                await updateItem({
                    id: editingId,
                    sku: values.sku,
                    name: values.name,
                    item_type: itemType,
                    base_unit: values.base_unit,
                    item_subtype: values.item_subtype,
                    minimum_stock: values.minimum_stock ?? 0,
                    is_active: values.is_active ?? true,
                    updated_at: values.updated_at,
                });
                message.success(`${typeTitles[activeType]} updated`);
            } else {
                await createItem({
                    sku: values.sku,
                    name: values.name,
                    item_type: itemType,
                    base_unit: values.base_unit,
                    item_subtype: values.item_subtype,
                    minimum_stock: values.minimum_stock ?? 0,
                    is_active: values.is_active ?? true,
                });
                message.success(`${typeTitles[activeType]} created`);
            }
            resetForm();
            await refresh();
        } catch (error) {
            message.error(
                error instanceof Error ? error.message : "Failed to save item",
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            <Segmented
                block
                className="item-master-type-switch"
                options={typeViews}
                value={activeType}
                onChange={value => {
                    const nextType = value as ItemMaster["item_type"];
                    setActiveType(nextType);
                    form.resetFields();
                    form.setFieldsValue({
                        is_active: true,
                        item_type: nextType,
                        minimum_stock: 0,
                    });
                    setEditingId(null);
                    onDirtyChange(false);
                }}
            />
            {activeType === "PACKING_MATERIAL" ? (
                <div className="item-master-shortcuts">
                    <Button
                        type="link"
                        className="item-master-shortcuts__link"
                        onClick={() => navigate("/packing/materials")}
                    >
                        Open Packaging Profiles
                    </Button>
                </div>
            ) : null}
            {readOnly ? (
                <Alert
                    type="info"
                    showIcon
                    title="Read-only access"
                    description="Your role can view Item Master records, but cannot create or edit in Masters."
                />
            ) : null}
            <div
                className={`item-master-split${readOnly ? " item-master-split--readonly" : ""}`}
            >
                <div className="item-master-split__table">
                    <Table<ItemMaster>
                        rowKey="id"
                        loading={loading}
                        dataSource={items}
                        pagination={{ pageSize: 8 }}
                        columns={[
                            { title: "Name", dataIndex: "name" },
                            { title: "Base Unit", dataIndex: "base_unit" },
                            {
                                title: "Subtype",
                                dataIndex: "item_subtype",
                                render: (val: string) =>
                                    val ? (
                                        val
                                    ) : (
                                        <span style={{ color: "#bfbfbf" }}>
                                            —
                                        </span>
                                    ),
                            },
                            {
                                title: "SKU",
                                dataIndex: "sku",
                                render: (val: string) =>
                                    val ? (
                                        val
                                    ) : (
                                        <span style={{ color: "#bfbfbf" }}>
                                            —
                                        </span>
                                    ),
                            },
                            ...(readOnly
                                ? []
                                : [
                                      {
                                          title: "Actions",
                                          key: "actions",
                                          render: (
                                              _: unknown,
                                              row: ItemMaster,
                                          ) => (
                                              <Button
                                                  size="small"
                                                  onClick={() => {
                                                      setEditingId(row.id);
                                                      form.setFieldsValue({
                                                          id: row.id,
                                                          sku: row.sku,
                                                          name: row.name,
                                                          item_type:
                                                              row.item_type,
                                                          base_unit:
                                                              row.base_unit,
                                                          item_subtype:
                                                              row.item_subtype,
                                                          minimum_stock:
                                                              row.minimum_stock,
                                                          is_active:
                                                              row.is_active,
                                                          updated_at:
                                                              row.updated_at,
                                                      });
                                                      onDirtyChange(true);
                                                  }}
                                                  disabled={writeDisabled}
                                              >
                                                  Edit
                                              </Button>
                                          ),
                                      },
                                  ]),
                        ]}
                    />
                </div>

                {!readOnly ? (
                    <div className="item-master-split__form">
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={onFinish}
                            initialValues={{
                                is_active: true,
                                item_type: activeType,
                                minimum_stock: 0,
                            }}
                        >
                            <Form.Item
                                label="Item Name"
                                name="name"
                                rules={[
                                    {
                                        required: true,
                                        message: "Item name is required",
                                    },
                                ]}
                            >
                                <Input
                                    autoFocus
                                    placeholder="Enter item name"
                                />
                            </Form.Item>
                            <Form.Item label="Item Code (SKU)" name="sku">
                                <Input placeholder="Optional SKU/code" />
                            </Form.Item>
                            <Space style={{ width: "100%" }} size={12} wrap>
                                <Form.Item hidden name="item_type">
                                    <Input />
                                </Form.Item>
                                <Form.Item
                                    style={{ minWidth: 220, flex: 1 }}
                                    label="Base Unit"
                                    name="base_unit"
                                    rules={[
                                        {
                                            required: true,
                                            message: "Base unit is required",
                                        },
                                    ]}
                                >
                                    <Input placeholder="kg, g, pcs, ltr..." />
                                </Form.Item>
                            </Space>
                            <Space style={{ width: "100%" }} size={12} wrap>
                                <Form.Item
                                    style={{ minWidth: 220 }}
                                    label="Minimum Stock"
                                    name="minimum_stock"
                                >
                                    <InputNumber
                                        min={0}
                                        style={{ width: "100%" }}
                                    />
                                </Form.Item>
                                <Form.Item
                                    style={{ minWidth: 220 }}
                                    label="Active"
                                    name="is_active"
                                    valuePropName="checked"
                                >
                                    <Switch />
                                </Form.Item>
                            </Space>
                            <Form.Item name="updated_at" hidden>
                                <Input />
                            </Form.Item>
                            <Space>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={submitting}
                                    disabled={writeDisabled}
                                >
                                    {editingId ? "Update Item" : "Create Item"}
                                </Button>
                                <Button
                                    onClick={resetForm}
                                    disabled={writeDisabled || submitting}
                                >
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
