import { Button, Form, Input, Space, message } from "antd";
import { useEffect, useMemo } from "react";
import { useAutoSave } from "../../hooks/useAutoSave";

type GRNValues = {
    supplierName?: string;
    invoiceNumber?: string;
    notes?: string;
};

type GRNFormProps = {
    userKey: string;
    onDirtyChange: (isDirty: boolean) => void;
};

const EMPTY_GRN_VALUES: GRNValues = {};

export function GRNForm({ userKey, onDirtyChange }: GRNFormProps) {
    const [form] = Form.useForm<GRNValues>();
    const watchedValues = Form.useWatch([], form) ?? EMPTY_GRN_VALUES;

    const hasContent = useMemo(
        () =>
            Object.values(watchedValues).some(value =>
                typeof value === "string" ? value.trim().length > 0 : false,
            ),
        [watchedValues],
    );

    useEffect(() => {
        onDirtyChange(hasContent);
    }, [hasContent, onDirtyChange]);

    const { clearDraft } = useAutoSave<GRNValues>(`${userKey}:grn`, watchedValues, {
        enabled: hasContent,
        contextLabel: "GRN",
        shouldSave: value =>
            Object.values(value).some(item =>
                typeof item === "string" ? item.trim().length > 0 : false,
            ),
        onRestore: value => {
            form.setFieldsValue(value);
            onDirtyChange(true);
        },
        onDiscard: () => {
            onDirtyChange(false);
        },
    });

    const onFinish = (values: GRNValues) => {
        message.success(`GRN draft submitted for ${values.supplierName || "supplier"}`);
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
                label="Supplier Name"
                name="supplierName"
                rules={[{ required: true, message: "Supplier name is required" }]}
            >
                <Input placeholder="Enter supplier" />
            </Form.Item>
            <Form.Item label="Invoice Number" name="invoiceNumber">
                <Input placeholder="Enter invoice number" />
            </Form.Item>
            <Form.Item label="Notes" name="notes">
                <Input.TextArea rows={4} placeholder="Optional notes" />
            </Form.Item>
            <Space>
                <Button type="primary" htmlType="submit">
                    Submit GRN
                </Button>
                <Button
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
