import { Button, Form, Input, InputNumber, Space, message } from "antd";
import { useEffect, useMemo } from "react";
import { useAutoSave } from "../../hooks/useAutoSave";

type BatchValues = {
    batchNumber?: string;
    productName?: string;
    quantity?: number;
};

type BatchFormProps = {
    userKey: string;
    onDirtyChange: (isDirty: boolean) => void;
    writeDisabled?: boolean;
};

const EMPTY_BATCH_VALUES: BatchValues = {};

export function BatchForm({ userKey, onDirtyChange, writeDisabled = false }: BatchFormProps) {
    const [form] = Form.useForm<BatchValues>();
    const watchedValues = Form.useWatch([], form) ?? EMPTY_BATCH_VALUES;

    const hasContent = useMemo(
        () =>
            Object.values(watchedValues).some(value => {
                if (typeof value === "number") {
                    return value > 0;
                }
                return typeof value === "string" && value.trim().length > 0;
            }),
        [watchedValues],
    );

    useEffect(() => {
        onDirtyChange(hasContent);
    }, [hasContent, onDirtyChange]);

    const { clearDraft } = useAutoSave<BatchValues>(`${userKey}:batch`, watchedValues, {
        enabled: hasContent,
        contextLabel: "Batch",
        shouldSave: value =>
            Object.values(value).some(item => {
                if (typeof item === "number") {
                    return item > 0;
                }
                return typeof item === "string" && item.trim().length > 0;
            }),
        onRestore: value => {
            form.setFieldsValue(value);
            onDirtyChange(true);
        },
        onDiscard: () => {
            onDirtyChange(false);
        },
    });

    const onFinish = (values: BatchValues) => {
        message.success(`Batch ${values.batchNumber || "record"} submitted`);
        clearDraft();
        form.resetFields();
        onDirtyChange(false);
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
        >
            <Form.Item
                label="Batch Number"
                name="batchNumber"
                rules={[{ required: true, message: "Batch number is required" }]}
            >
                <Input placeholder="Enter batch number" />
            </Form.Item>
            <Form.Item
                label="Product Name"
                name="productName"
                rules={[{ required: true, message: "Product name is required" }]}
            >
                <Input placeholder="Enter product name" />
            </Form.Item>
            <Form.Item label="Quantity (kg)" name="quantity">
                <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Space>
                <Button type="primary" htmlType="submit" disabled={writeDisabled}>
                    Submit Batch
                </Button>
                <Button
                    disabled={writeDisabled}
                    onClick={() => {
                        form.resetFields();
                        clearDraft();
                        onDirtyChange(false);
                    }}
                >
                    Reset
                </Button>
            </Space>
        </Form>
    );
}
