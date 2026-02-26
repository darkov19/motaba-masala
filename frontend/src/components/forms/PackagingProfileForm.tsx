import { Alert, Button, Form, Input, InputNumber, Select, Space, Table, Tag, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
    createPackagingProfile,
    ItemMaster,
    listItems,
    listPackagingProfiles,
    PackagingProfile,
} from "../../services/masterDataApi";

type ProfileFormValues = {
    name: string;
    pack_mode: string;
    components: Array<{
        packing_material_item_id?: number;
        qty_per_unit?: number | null;
    }>;
};

type PackagingProfileFormProps = {
    onDirtyChange: (dirty: boolean) => void;
    writeDisabled?: boolean;
    readOnly?: boolean;
};

export function PackagingProfileForm({ onDirtyChange, writeDisabled = false, readOnly = false }: PackagingProfileFormProps) {
    const [form] = Form.useForm<ProfileFormValues>();
    const watched = Form.useWatch([], form);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [profiles, setProfiles] = useState<PackagingProfile[]>([]);
    const [packingItems, setPackingItems] = useState<ItemMaster[]>([]);
    const packingLabelById = useMemo(() => {
        const lookup = new Map<number, string>();
        for (const item of packingItems) {
            lookup.set(item.id, item.item_subtype ? `${item.name} (${item.item_subtype})` : item.name);
        }
        return lookup;
    }, [packingItems]);

    const hasContent = useMemo(() => {
        if (!watched) {
            return false;
        }
        if (typeof watched.name === "string" && watched.name.trim() !== "") {
            return true;
        }
        if (typeof watched.pack_mode === "string" && watched.pack_mode.trim() !== "") {
            return true;
        }
        if (!Array.isArray(watched.components)) {
            return false;
        }

        const components = watched.components;
        if (components.length !== 1) {
            return true;
        }

        const [first] = components;
        const firstItemID = Number(first?.packing_material_item_id || 0);
        if (firstItemID > 0) {
            return true;
        }
        const rawQty = first?.qty_per_unit;
        if (rawQty == null) {
            return false;
        }
        const qty = Number(rawQty);
        if (!Number.isFinite(qty)) {
            return false;
        }
        return qty !== 1;
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
            const [activeItems, activeProfiles] = await Promise.all([listItems(true), listPackagingProfiles(true)]);
            setPackingItems(activeItems.filter(item => item.item_type === "PACKING_MATERIAL"));
            setProfiles(activeProfiles);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const reset = () => {
        form.resetFields();
        form.setFieldsValue({ components: [{ qty_per_unit: 1 }] });
        onDirtyChange(false);
    };

    const onFinish = async (values: ProfileFormValues) => {
        setSubmitting(true);
        try {
            const normalized = (values.components || []).map(c => ({
                packing_material_item_id: Number(c.packing_material_item_id),
                qty_per_unit: Number(c.qty_per_unit),
            }));
            const selectedIDs = normalized.map(c => c.packing_material_item_id).filter(id => Number.isFinite(id) && id > 0);
            const uniqueIDs = new Set(selectedIDs);
            if (uniqueIDs.size !== selectedIDs.length) {
                message.error("Duplicate packing material components are not allowed");
                return;
            }
            if (normalized.some(c => !Number.isFinite(c.qty_per_unit) || c.qty_per_unit <= 0)) {
                message.error("Each component quantity must be greater than zero");
                return;
            }

            await createPackagingProfile({
                name: values.name,
                pack_mode: values.pack_mode,
                components: normalized,
            });
            message.success("Packaging profile created");
            reset();
            await load();
        } catch (error) {
            message.error(error instanceof Error ? error.message : "Failed to save profile");
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
                    message="Read-only access"
                    description="Your role can view Packaging Profiles, but cannot create or edit them."
                />
            ) : null}
            <div className={`packaging-profile-split${readOnly ? " packaging-profile-split--readonly" : ""}`}>
                <div className="packaging-profile-split__table">
                    <Table<PackagingProfile>
                        rowKey="id"
                        loading={loading}
                        dataSource={profiles}
                        pagination={{ pageSize: 8 }}
                        columns={[
                            { title: "Name", dataIndex: "name" },
                            { title: "Pack Mode", dataIndex: "pack_mode", render: value => <Tag color="geekblue">{value}</Tag> },
                            {
                                title: "Components",
                                key: "components",
                                render: (_, row) => {
                                    const preview = row.components.slice(0, 2);
                                    const remaining = Math.max(0, row.components.length - preview.length);
                                    return (
                                        <Space wrap size={[4, 4]}>
                                            {preview.map(component => {
                                                const label = packingLabelById.get(component.packing_material_item_id)
                                                    || `Item #${component.packing_material_item_id}`;
                                                return (
                                                    <Tag key={`${row.id}-${component.packing_material_item_id}`}>
                                                        {label} x{component.qty_per_unit}
                                                    </Tag>
                                                );
                                            })}
                                            {remaining > 0 ? <Tag>+{remaining} more</Tag> : null}
                                        </Space>
                                    );
                                },
                            },
                        ]}
                    />
                </div>

                {!readOnly ? (
                    <div className="packaging-profile-split__form">
                    <Form
                        form={form}
                        layout="vertical"
                        initialValues={{ components: [{ qty_per_unit: 1 }] }}
                        onFinish={onFinish}
                    >
                        <Space style={{ width: "100%" }} size={12} wrap>
                            <Form.Item style={{ minWidth: 260, flex: 1 }} label="Profile Name" name="name" rules={[{ required: true, message: "Profile name is required" }]}>
                                <Input autoFocus placeholder="Jar Pack 200g" />
                            </Form.Item>
                            <Form.Item style={{ minWidth: 260, flex: 1 }} label="Pack Mode" name="pack_mode" rules={[{ required: true, message: "Pack mode is required" }]}>
                                <Input placeholder="JAR_200G" />
                            </Form.Item>
                        </Space>

                        <Form.List name="components">
                            {(fields, { add, remove }) => (
                                <Space orientation="vertical" size={8} style={{ width: "100%" }}>
                                    {fields.map(field => (
                                        <Space key={field.key} align="baseline" wrap style={{ width: "100%" }}>
                                            <Form.Item
                                                style={{ minWidth: 280, flex: 1 }}
                                                name={[field.name, "packing_material_item_id"]}
                                                label="Packing Material"
                                                rules={[{ required: true, message: "Select an item" }]}
                                            >
                                                <Select
                                                    placeholder="Select PACKING_MATERIAL item"
                                                    options={packingItems.map(item => ({
                                                        label: `${item.name}${item.item_subtype ? ` (${item.item_subtype})` : ""}`,
                                                        value: item.id,
                                                    }))}
                                                    showSearch
                                                    optionFilterProp="label"
                                                />
                                            </Form.Item>
                                            <Form.Item
                                                style={{ minWidth: 180 }}
                                                name={[field.name, "qty_per_unit"]}
                                                label="Qty / Unit"
                                                rules={[{ required: true, message: "Quantity is required" }]}
                                            >
                                                <InputNumber min={0.0001} step={0.1} style={{ width: "100%" }} />
                                            </Form.Item>
                                            <Button danger onClick={() => remove(field.name)} disabled={writeDisabled}>
                                                Remove
                                            </Button>
                                        </Space>
                                    ))}
                                    <Button onClick={() => add({ qty_per_unit: 1 })} disabled={writeDisabled}>
                                        Add Component
                                    </Button>
                                </Space>
                            )}
                        </Form.List>

                        <Space>
                            <Button type="primary" htmlType="submit" loading={submitting} disabled={writeDisabled}>
                                Create Profile
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
