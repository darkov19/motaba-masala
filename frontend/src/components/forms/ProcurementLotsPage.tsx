import { Alert, Button, Form, Input, Select, Space, Table, Tag, Typography, message } from "antd";
import type { InputRef } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ItemMaster, MaterialLot, getItemStockBalance, listItems, listMaterialLots } from "../../services/masterDataApi";

type ProcurementLotsPageProps = {
    onDirtyChange: (isDirty: boolean) => void;
};

type LotFilters = {
    search?: string;
    lotNumber?: string;
    grnNumber?: string;
    supplier?: string;
    itemId?: number;
};

type UiError = {
    title: string;
    detail: string;
    type: "error" | "warning";
};

const EMPTY_FILTERS: LotFilters = {};

function toUiError(raw: unknown): UiError {
    const detail = raw instanceof Error ? raw.message : "Failed to load lots";
    const normalized = detail.toLowerCase();
    if (normalized.includes("forbidden") || normalized.includes("not allowed")) {
        return {
            title: "Access denied (403)",
            detail,
            type: "warning",
        };
    }
    if (normalized.includes("unauthorized") || normalized.includes("invalid token") || normalized.includes("expired")) {
        return {
            title: "Authentication required (401)",
            detail,
            type: "warning",
        };
    }
    if (normalized.includes("validation")) {
        return {
            title: "Invalid filter input (400)",
            detail,
            type: "warning",
        };
    }
    return {
        title: "Unable to load lots",
        detail,
        type: "error",
    };
}

export function ProcurementLotsPage({ onDirtyChange }: ProcurementLotsPageProps) {
    const [form] = Form.useForm<LotFilters>();
    const searchRef = useRef<InputRef>(null);
    const [rows, setRows] = useState<MaterialLot[]>([]);
    const [items, setItems] = useState<ItemMaster[]>([]);
    const [loading, setLoading] = useState(false);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [error, setError] = useState<UiError | null>(null);
    const [stockBalances, setStockBalances] = useState<Map<number, number>>(new Map());

    useEffect(() => {
        onDirtyChange(false);
    }, [onDirtyChange]);

    useEffect(() => {
        setTimeout(() => {
            searchRef.current?.focus();
        }, 0);
    }, []);

    const itemLabelByID = useMemo(() => {
        const map = new Map<number, string>();
        for (const item of items) {
            map.set(item.id, item.name);
        }
        return map;
    }, [items]);

    const itemMinimumStock = useMemo(() => {
        const map = new Map<number, number>();
        for (const item of items) {
            map.set(item.id, item.minimum_stock ?? 0);
        }
        return map;
    }, [items]);

    const normalizedFilters = useCallback((values: LotFilters): LotFilters => ({
        search: values.search?.trim() || undefined,
        lotNumber: values.lotNumber?.trim() || undefined,
        grnNumber: values.grnNumber?.trim() || undefined,
        supplier: values.supplier?.trim() || undefined,
        itemId: values.itemId,
    }), []);

    const fetchLots = useCallback(async (filters: LotFilters) => {
        setLoading(true);
        setError(null);
        try {
            const nextRows = await listMaterialLots({
                activeOnly: true,
                ...normalizedFilters(filters),
            });
            setRows(nextRows);
        } catch (raw) {
            setRows([]);
            setError(toUiError(raw));
        } finally {
            setLoading(false);
            setHasLoadedOnce(true);
        }
    }, [normalizedFilters]);

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
                    message.warning(raw instanceof Error ? raw.message : "Failed to load item options");
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

    useEffect(() => {
        void fetchLots(EMPTY_FILTERS);
    }, [fetchLots]);

    useEffect(() => {
        if (rows.length === 0) {
            return;
        }
        let mounted = true;
        const uniqueItemIds = [...new Set(rows.map(r => r.item_id))];
        const fetchBalances = async () => {
            const results = await Promise.allSettled(
                uniqueItemIds.map(id => getItemStockBalance(id).then(bal => ({ id, bal }))),
            );
            if (!mounted) {
                return;
            }
            const next = new Map<number, number>();
            for (const result of results) {
                if (result.status === "fulfilled") {
                    next.set(result.value.id, result.value.bal);
                }
            }
            setStockBalances(next);
        };
        void fetchBalances();
        return () => {
            mounted = false;
        };
    }, [rows]);

    const onSearch = useCallback(() => {
        void fetchLots(form.getFieldsValue());
    }, [fetchLots, form]);

    const onReset = useCallback(() => {
        form.resetFields();
        void fetchLots(EMPTY_FILTERS);
    }, [fetchLots, form]);

    const columns = useMemo<ColumnsType<MaterialLot>>(() => [
        { title: "Lot Number", dataIndex: "lot_number", key: "lot_number", width: 180 },
        { title: "GRN Reference", dataIndex: "grn_number", key: "grn_number", width: 140 },
        {
            title: "Supplier",
            key: "supplier",
            width: 200,
            render: (_: unknown, record: MaterialLot) => (
                <Space size={4}>
                    <Typography.Text>{record.supplier_name}</Typography.Text>
                    {record.source_type === "SUPPLIER_GRN" && (
                        <Tag color="orange">External</Tag>
                    )}
                </Space>
            ),
        },
        {
            title: "Item",
            dataIndex: "item_id",
            key: "item_id",
            width: 260,
            render: (value: number) => {
                const minStock = itemMinimumStock.get(value) ?? 0;
                const balance = stockBalances.get(value);
                const isLowStock = balance !== undefined && minStock > 0 && balance < minStock;
                return (
                    <Space size={6}>
                        <Tag color="geekblue">#{value}</Tag>
                        <Typography.Text>{itemLabelByID.get(value) || "Unknown item"}</Typography.Text>
                        {isLowStock && <Tag color="orange">Low Stock</Tag>}
                    </Space>
                );
            },
        },
        { title: "Quantity", dataIndex: "quantity_received", key: "quantity_received", width: 120 },
        {
            title: "Unit Cost",
            dataIndex: "unit_cost",
            key: "unit_cost",
            width: 110,
            render: (value: number) => value > 0 ? value.toFixed(2) : "—",
        },
        {
            title: "Created",
            dataIndex: "created_at",
            key: "created_at",
            width: 220,
            render: (value: string) => {
                const parsed = new Date(value);
                if (Number.isNaN(parsed.valueOf())) {
                    return value;
                }
                return parsed.toLocaleString();
            },
        },
    ], [itemLabelByID, itemMinimumStock, stockBalances]);

    return (
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            <Form form={form} layout="vertical" onFinish={onSearch}>
                <Space align="end" wrap style={{ width: "100%" }}>
                    <Form.Item label="Search" name="search" style={{ minWidth: 220, flex: 1, marginBottom: 0 }}>
                        <Input ref={searchRef} allowClear placeholder="lot, GRN, supplier..." onPressEnter={onSearch} />
                    </Form.Item>
                    <Form.Item label="Lot Number" name="lotNumber" style={{ minWidth: 180, marginBottom: 0 }}>
                        <Input allowClear placeholder="LOT-..." onPressEnter={onSearch} />
                    </Form.Item>
                    <Form.Item label="GRN Number" name="grnNumber" style={{ minWidth: 160, marginBottom: 0 }}>
                        <Input allowClear placeholder="GRN-..." onPressEnter={onSearch} />
                    </Form.Item>
                    <Form.Item label="Supplier" name="supplier" style={{ minWidth: 200, marginBottom: 0 }}>
                        <Input allowClear placeholder="Supplier name" onPressEnter={onSearch} />
                    </Form.Item>
                    <Form.Item label="Item" name="itemId" style={{ minWidth: 240, marginBottom: 0 }}>
                        <Select
                            allowClear
                            showSearch
                            loading={itemsLoading}
                            optionFilterProp="label"
                            placeholder="Any item"
                            options={items.map(item => ({ value: item.id, label: `${item.name} (#${item.id})` }))}
                        />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>Search</Button>
                    <Button htmlType="button" onClick={onReset} disabled={loading}>Reset</Button>
                </Space>
            </Form>

            {error ? (
                <Alert showIcon type={error.type} title={error.title} description={error.detail} />
            ) : null}
            {!loading && hasLoadedOnce && rows.length === 0 && !error ? (
                <Alert
                    showIcon
                    type="info"
                    title="No lots found"
                    description="No material lots match the current filters."
                />
            ) : null}

            <Table<MaterialLot>
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={rows}
                pagination={{ pageSize: 10 }}
                size="small"
                scroll={{ x: 1300 }}
            />
        </Space>
    );
}
