import { useState } from "react";
import { Alert, Button, Card, Form, Input, Select, Space, Typography, message } from "antd";
import { createUser, extractErrorMessage } from "../../services/authApi";

const { Text } = Typography;

type AdminUserFormValues = {
    username: string;
    password: string;
    role: "admin" | "operator";
};

type AdminUserFormProps = {
    writeDisabled: boolean;
};

export function AdminUserForm({ writeDisabled }: AdminUserFormProps) {
    const [form] = Form.useForm<AdminUserFormValues>();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (values: AdminUserFormValues) => {
        setIsSubmitting(true);
        try {
            await createUser(values);
            message.success(`User "${values.username}" created successfully.`);
            form.resetFields();
            form.setFieldValue("role", "operator");
        } catch (error) {
            message.error(extractErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            <Alert
                type="info"
                showIcon
                title="Admin-only user provisioning"
                description="Create users with backend authorization checks. This UI is a convenience layer; backend remains the security authority."
            />
            <Card size="small" title="Create User">
                <Form<AdminUserFormValues>
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    initialValues={{ role: "operator" }}
                >
                    <Form.Item
                        name="username"
                        label="Username"
                        rules={[
                            { required: true, message: "Username is required" },
                            { min: 3, message: "Username must be at least 3 characters" },
                        ]}
                    >
                        <Input autoComplete="username" placeholder="e.g. inventory.operator" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label="Password"
                        rules={[
                            { required: true, message: "Password is required" },
                            { min: 8, message: "Password must be at least 8 characters" },
                        ]}
                    >
                        <Input.Password autoComplete="new-password" placeholder="Enter secure password" />
                    </Form.Item>

                    <Form.Item
                        name="role"
                        label="Role"
                        rules={[{ required: true, message: "Role is required" }]}
                    >
                        <Select
                            options={[
                                { label: "Data Entry Operator", value: "operator" },
                                { label: "Admin", value: "admin" },
                            ]}
                        />
                    </Form.Item>

                    <Space orientation="vertical" size={8} style={{ width: "100%" }}>
                        {writeDisabled ? (
                            <Text type="warning">
                                Write actions are currently disabled due to license state.
                            </Text>
                        ) : null}
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={isSubmitting}
                            disabled={writeDisabled}
                        >
                            Create User
                        </Button>
                    </Space>
                </Form>
            </Card>
        </Space>
    );
}
