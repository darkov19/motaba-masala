import { Alert, Button, Form, Input, InputNumber, Segmented, Select, Space, Switch, Table, Tag, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createParty, listParties, Party, PartyType, updateParty } from "../../services/masterDataApi";

type PartyMasterFormValues = {
    id?: number;
    party_type: PartyType;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    lead_time_days?: number | null;
    is_active?: boolean;
    updated_at?: string;
};

type PartyMasterFormProps = {
    onDirtyChange: (dirty: boolean) => void;
    writeDisabled?: boolean;
    readOnly?: boolean;
};

const partyViews: Array<{ label: string; value: PartyType }> = [
    { label: "Suppliers", value: "SUPPLIER" },
    { label: "Customers", value: "CUSTOMER" },
];

export function PartyMasterForm({ onDirtyChange, writeDisabled = false, readOnly = false }: PartyMasterFormProps) {
    const [form] = Form.useForm<PartyMasterFormValues>();
    const watched = Form.useWatch([], form);
    const selectedType = Form.useWatch("party_type", form);
    const [activeType, setActiveType] = useState<PartyType>("SUPPLIER");
    const [search, setSearch] = useState("");
    const [rows, setRows] = useState<Party[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingID, setEditingID] = useState<number | null>(null);

    const hasContent = useMemo(() => {
        if (!watched) {
            return false;
        }
        const candidate = {
            ...watched,
            party_type: undefined,
            is_active: undefined,
            id: undefined,
            updated_at: undefined,
        };
        return Object.values(candidate).some(value => {
            if (typeof value === "number") {
                return value > 0;
            }
            return typeof value === "string" && value.trim().length > 0;
        });
    }, [watched]);

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
            const parties = await listParties({
                activeOnly: true,
                partyType: activeType,
                search: search.trim() || undefined,
            });
            setRows(parties);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "Failed to load parties");
        } finally {
            setLoading(false);
        }
    }, [activeType, search]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const resetForm = useCallback(() => {
        form.resetFields();
        form.setFieldsValue({
            party_type: activeType,
            is_active: true,
        });
        setEditingID(null);
        onDirtyChange(false);
    }, [activeType, form, onDirtyChange]);

    const onFinish = async (values: PartyMasterFormValues) => {
        const phone = values.phone?.trim() || "";
        const email = values.email?.trim() || "";
        const address = values.address?.trim() || "";
        if (!phone && !email && !address) {
            message.error("Provide at least one contact field (phone, email, or address)");
            return;
        }

        setSubmitting(true);
        const payload = {
            party_type: values.party_type,
            name: values.name,
            phone,
            email,
            address,
            lead_time_days: values.party_type === "SUPPLIER" && values.lead_time_days !== null
                ? values.lead_time_days ?? undefined
                : undefined,
            is_active: values.is_active ?? true,
        };
        try {
            if (editingID && values.updated_at) {
                await updateParty({
                    id: editingID,
                    updated_at: values.updated_at,
                    ...payload,
                });
                message.success("Party updated");
            } else {
                await createParty(payload);
                message.success("Party created");
            }
            resetForm();
            await refresh();
        } catch (error) {
            message.error(error instanceof Error ? error.message : "Failed to save party");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            <Segmented
                block
                options={partyViews}
                value={activeType}
                onChange={value => {
                    const nextType = value as PartyType;
                    setActiveType(nextType);
                    form.resetFields();
                    form.setFieldsValue({ party_type: nextType, is_active: true });
                    setEditingID(null);
                    onDirtyChange(false);
                }}
            />
            {readOnly ? (
                <Alert
                    type="info"
                    showIcon
                    title="Read-only access"
                    description="Your role can view supplier/customer records, but cannot create or edit them."
                />
            ) : null}
            <div className={`party-master-split${readOnly ? " party-master-split--readonly" : ""}`}>
                <div className="party-master-split__table">
                    <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 12 }} wrap>
                        <Input.Search
                            allowClear
                            placeholder={`Search ${activeType === "SUPPLIER" ? "suppliers" : "customers"}...`}
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            onSearch={() => void refresh()}
                            style={{ maxWidth: 320 }}
                        />
                        <Button onClick={() => void refresh()} loading={loading}>
                            Refresh
                        </Button>
                    </Space>
                    <Table<Party>
                        rowKey="id"
                        loading={loading}
                        dataSource={rows}
                        pagination={{ pageSize: 8 }}
                        columns={[
                            { title: "Name", dataIndex: "name" },
                            {
                                title: "Type",
                                dataIndex: "party_type",
                                render: value => <Tag color={value === "SUPPLIER" ? "gold" : "blue"}>{value}</Tag>,
                            },
                            { title: "Phone", dataIndex: "phone", render: value => value || "-" },
                            { title: "Email", dataIndex: "email", render: value => value || "-" },
                            { title: "Lead Time", dataIndex: "lead_time_days", render: value => value ?? "-" },
                            ...(readOnly
                                ? []
                                : [{
                                    title: "Actions",
                                    key: "actions",
                                    render: (_: unknown, row: Party) => (
                                        <Button
                                            size="small"
                                            onClick={() => {
                                                setEditingID(row.id);
                                                form.setFieldsValue({
                                                    id: row.id,
                                                    party_type: row.party_type,
                                                    name: row.name,
                                                    phone: row.phone,
                                                    email: row.email,
                                                    address: row.address,
                                                    lead_time_days: row.lead_time_days,
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
                                }]),
                        ]}
                    />
                </div>

                {!readOnly ? (
                    <div className="party-master-split__form">
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={onFinish}
                            initialValues={{ party_type: activeType, is_active: true }}
                        >
                            <Form.Item label="Party Type" name="party_type" rules={[{ required: true, message: "Party type is required" }]}>
                                <Select
                                    options={[
                                        { label: "Supplier", value: "SUPPLIER" },
                                        { label: "Customer", value: "CUSTOMER" },
                                    ]}
                                />
                            </Form.Item>
                            <Form.Item label="Name" name="name" rules={[{ required: true, message: "Name is required" }]}>
                                <Input autoFocus placeholder="Acme Supplier / Metro Distributor" />
                            </Form.Item>
                            <Space style={{ width: "100%" }} size={12} wrap>
                                <Form.Item style={{ minWidth: 220, flex: 1 }} label="Phone" name="phone">
                                    <Input placeholder="Contact phone number" />
                                </Form.Item>
                                <Form.Item
                                    style={{ minWidth: 220, flex: 1 }}
                                    label="Email"
                                    name="email"
                                    rules={[{ type: "email", message: "Email is invalid" }]}
                                >
                                    <Input placeholder="name@example.com" />
                                </Form.Item>
                            </Space>
                            <Form.Item label="Address" name="address">
                                <Input.TextArea rows={3} placeholder="Address / location details" />
                            </Form.Item>
                            {selectedType === "SUPPLIER" ? (
                                <Form.Item label="Lead Time (days)" name="lead_time_days">
                                    <InputNumber min={0} style={{ width: "100%" }} />
                                </Form.Item>
                            ) : null}
                            <Form.Item label="Active" name="is_active" valuePropName="checked">
                                <Switch />
                            </Form.Item>
                            <Form.Item name="updated_at" hidden>
                                <Input />
                            </Form.Item>
                            <Space>
                                <Button type="primary" htmlType="submit" loading={submitting} disabled={writeDisabled}>
                                    {editingID ? "Update Party" : "Create Party"}
                                </Button>
                                <Button onClick={resetForm} disabled={writeDisabled || submitting}>
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
