import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from "antd";
import {
    createUser,
    deleteUser,
    extractErrorMessage,
    listUsers,
    resetUserPassword,
    setUserActive,
    type UserAccount,
    updateUserRole,
} from "../../services/authApi";

const { Text } = Typography;

type AdminUserFormValues = {
    username: string;
    password: string;
    role: "admin" | "operator";
};

type ResetPasswordValues = {
    new_password: string;
};

type AdminUserFormProps = {
    writeDisabled: boolean;
};

function getRoleLabel(role: UserAccount["role"]): string {
    return role === "Admin" ? "Admin" : "Data Entry Operator";
}

function getRoleToggleTarget(role: UserAccount["role"]): "admin" | "operator" {
    return role === "Admin" ? "operator" : "admin";
}

function formatDateTime(raw: string): string {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
        return "N/A";
    }
    return parsed.toLocaleString();
}

function resolveCurrentUsername(): string {
    if (typeof window === "undefined") {
        return "";
    }
    try {
        return (window.localStorage.getItem("username") || window.localStorage.getItem("user_name") || "").trim();
    } catch {
        return "";
    }
}

export function AdminUserForm({ writeDisabled }: AdminUserFormProps) {
    const [createForm] = Form.useForm<AdminUserFormValues>();
    const [resetForm] = Form.useForm<ResetPasswordValues>();
    const [users, setUsers] = useState<UserAccount[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
    const [busyUserAction, setBusyUserAction] = useState<string | null>(null);
    const [resetTargetUser, setResetTargetUser] = useState<UserAccount | null>(null);
    const [isSubmittingReset, setIsSubmittingReset] = useState(false);

    const currentUsername = useMemo(resolveCurrentUsername, []);

    const loadUsers = useCallback(async () => {
        setIsLoadingUsers(true);
        try {
            const result = await listUsers();
            setUsers(result);
        } catch (error) {
            message.error(extractErrorMessage(error));
        } finally {
            setIsLoadingUsers(false);
        }
    }, []);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    const handleCreateUser = async (values: AdminUserFormValues) => {
        setIsSubmittingCreate(true);
        try {
            await createUser(values);
            message.success(`User "${values.username}" created successfully.`);
            createForm.resetFields();
            createForm.setFieldValue("role", "operator");
            await loadUsers();
        } catch (error) {
            message.error(extractErrorMessage(error));
        } finally {
            setIsSubmittingCreate(false);
        }
    };

    const runUserMutation = async (username: string, operation: () => Promise<void>, successMessage: string) => {
        setBusyUserAction(username);
        try {
            await operation();
            message.success(successMessage);
            await loadUsers();
        } catch (error) {
            message.error(extractErrorMessage(error));
        } finally {
            setBusyUserAction(null);
        }
    };

    const handleToggleRole = async (user: UserAccount) => {
        const targetRole = getRoleToggleTarget(user.role);
        await runUserMutation(
            user.username,
            () => updateUserRole({ username: user.username, role: targetRole }),
            `Updated role for "${user.username}".`,
        );
    };

    const handleToggleActive = async (user: UserAccount) => {
        await runUserMutation(
            user.username,
            () => setUserActive({ username: user.username, is_active: !user.is_active }),
            user.is_active ? `Disabled "${user.username}".` : `Enabled "${user.username}".`,
        );
    };

    const handleDeleteUser = async (user: UserAccount) => {
        await runUserMutation(
            user.username,
            () => deleteUser({ username: user.username }),
            `Deleted "${user.username}".`,
        );
    };

    const openResetModal = (user: UserAccount) => {
        setResetTargetUser(user);
        resetForm.resetFields();
    };

    const closeResetModal = () => {
        if (isSubmittingReset) {
            return;
        }
        setResetTargetUser(null);
    };

    const handleResetPassword = async (values: ResetPasswordValues) => {
        if (!resetTargetUser) {
            return;
        }
        setIsSubmittingReset(true);
        try {
            await resetUserPassword({
                username: resetTargetUser.username,
                new_password: values.new_password,
            });
            message.success(`Password reset for "${resetTargetUser.username}".`);
            setResetTargetUser(null);
            await loadUsers();
        } catch (error) {
            message.error(extractErrorMessage(error));
        } finally {
            setIsSubmittingReset(false);
        }
    };

    return (
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            <Alert
                type="info"
                showIcon
                title="Admin-controlled user management"
                description="Create, list, update, disable, reset password, and delete users. Backend authorization remains the security authority."
            />
            <Card size="small" title="Create User">
                <Form<AdminUserFormValues>
                    form={createForm}
                    layout="vertical"
                    onFinish={handleCreateUser}
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
                            loading={isSubmittingCreate}
                            disabled={writeDisabled}
                        >
                            Create User
                        </Button>
                    </Space>
                </Form>
            </Card>

            <Card
                size="small"
                title="Existing Users"
                extra={(
                    <Button onClick={() => void loadUsers()} loading={isLoadingUsers}>
                        Refresh
                    </Button>
                )}
            >
                <Table<UserAccount>
                    rowKey={(record) => record.username}
                    loading={isLoadingUsers}
                    dataSource={users}
                    pagination={{ pageSize: 8 }}
                    locale={{ emptyText: "No users found." }}
                    columns={[
                        {
                            title: "Username",
                            dataIndex: "username",
                            key: "username",
                            render: (_, user) => {
                                const isSelf = currentUsername !== "" && currentUsername.toLowerCase() === user.username.toLowerCase();
                                return (
                                    <Space size={8}>
                                        <Text>{user.username}</Text>
                                        {isSelf ? <Tag color="blue">Current</Tag> : null}
                                    </Space>
                                );
                            },
                        },
                        {
                            title: "Role",
                            dataIndex: "role",
                            key: "role",
                            render: (value: UserAccount["role"]) => (
                                <Tag color={value === "Admin" ? "gold" : "default"}>
                                    {getRoleLabel(value)}
                                </Tag>
                            ),
                        },
                        {
                            title: "Status",
                            dataIndex: "is_active",
                            key: "is_active",
                            render: (isActive: boolean) => (
                                <Tag color={isActive ? "green" : "red"}>{isActive ? "Active" : "Disabled"}</Tag>
                            ),
                        },
                        {
                            title: "Updated",
                            dataIndex: "updated_at",
                            key: "updated_at",
                            render: (raw: string) => formatDateTime(raw),
                        },
                        {
                            title: "Actions",
                            key: "actions",
                            render: (_, user) => {
                                const isSelf = currentUsername !== "" && currentUsername.toLowerCase() === user.username.toLowerCase();
                                const isBusy = busyUserAction === user.username;

                                return (
                                    <Space wrap>
                                        <Button
                                            size="small"
                                            onClick={() => void handleToggleRole(user)}
                                            loading={isBusy}
                                            disabled={writeDisabled || isBusy}
                                        >
                                            {user.role === "Admin" ? "Set Operator" : "Set Admin"}
                                        </Button>
                                        <Button
                                            size="small"
                                            onClick={() => void handleToggleActive(user)}
                                            loading={isBusy}
                                            disabled={writeDisabled || isBusy || (isSelf && user.is_active)}
                                        >
                                            {user.is_active ? "Disable" : "Enable"}
                                        </Button>
                                        <Button
                                            size="small"
                                            onClick={() => openResetModal(user)}
                                            disabled={writeDisabled || isBusy}
                                        >
                                            Reset Password
                                        </Button>
                                        <Popconfirm
                                            title={`Delete user "${user.username}"?`}
                                            description="This action cannot be undone."
                                            okText="Delete"
                                            cancelText="Cancel"
                                            onConfirm={() => handleDeleteUser(user)}
                                            disabled={writeDisabled || isBusy || isSelf}
                                        >
                                            <Button
                                                danger
                                                size="small"
                                                loading={isBusy}
                                                disabled={writeDisabled || isBusy || isSelf}
                                            >
                                                Delete
                                            </Button>
                                        </Popconfirm>
                                    </Space>
                                );
                            },
                        },
                    ]}
                />
            </Card>

            <Modal
                title={resetTargetUser ? `Reset Password: ${resetTargetUser.username}` : "Reset Password"}
                open={resetTargetUser !== null}
                onCancel={closeResetModal}
                onOk={() => resetForm.submit()}
                okText="Reset Password"
                confirmLoading={isSubmittingReset}
                destroyOnHidden
            >
                <Form<ResetPasswordValues>
                    form={resetForm}
                    layout="vertical"
                    onFinish={handleResetPassword}
                >
                    <Form.Item
                        name="new_password"
                        label="New Password"
                        rules={[
                            { required: true, message: "New password is required" },
                            { min: 8, message: "Password must be at least 8 characters" },
                        ]}
                    >
                        <Input.Password autoComplete="new-password" placeholder="Enter a temporary password" />
                    </Form.Item>
                </Form>
            </Modal>
        </Space>
    );
}
