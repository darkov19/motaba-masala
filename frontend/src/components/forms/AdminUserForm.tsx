import { useCallback, useEffect, useMemo, useState } from "react";
import { DeleteOutlined, KeyOutlined, ReloadOutlined, SearchOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Badge, Button, Card, Form, Input, Modal, Popconfirm, Segmented, Select, Space, Switch, Table, Tag, Tooltip, Typography, message } from "antd";
import {
    createUser,
    deleteUser,
    extractErrorMessage,
    listUsers,
    resetUserPassword,
    setUserActive,
    type UserAccount,
} from "../../services/authApi";
import "./AdminUserForm.css";

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

type UserStatusFilter = "all" | "active" | "disabled";

function getRoleLabel(role: UserAccount["role"]): string {
    return role === "Admin" ? "Admin" : "Data Entry Operator";
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
    const [userSearch, setUserSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<UserStatusFilter>("all");

    const currentUsername = useMemo(resolveCurrentUsername, []);
    const normalizedCurrentUsername = useMemo(() => currentUsername.toLowerCase(), [currentUsername]);

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

    const handleSetActive = async (user: UserAccount, isActive: boolean) => {
        if (isActive === user.is_active) {
            return;
        }
        await runUserMutation(
            user.username,
            () => setUserActive({ username: user.username, is_active: isActive }),
            isActive ? `Enabled "${user.username}".` : `Disabled "${user.username}".`,
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

    const userStats = useMemo(() => {
        const total = users.length;
        const active = users.filter((user) => user.is_active).length;
        const disabled = total - active;
        return { total, active, disabled };
    }, [users]);

    const filteredUsers = useMemo(() => {
        const query = userSearch.trim().toLowerCase();
        return users.filter((user) => {
            if (statusFilter === "active" && !user.is_active) {
                return false;
            }
            if (statusFilter === "disabled" && user.is_active) {
                return false;
            }
            if (!query) {
                return true;
            }
            return user.username.toLowerCase().includes(query) || getRoleLabel(user.role).toLowerCase().includes(query);
        });
    }, [statusFilter, userSearch, users]);

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
            >
                <div className="existing-users-toolbar">
                    <Input
                        allowClear
                        value={userSearch}
                        onChange={(event) => setUserSearch(event.target.value)}
                        prefix={<SearchOutlined />}
                        placeholder="Search by username or role"
                        className="existing-users-toolbar__search"
                    />
                    <Space size={8} wrap>
                        <Segmented<UserStatusFilter>
                            value={statusFilter}
                            onChange={setStatusFilter}
                            options={[
                                { label: `All (${userStats.total})`, value: "all" },
                                { label: `Active (${userStats.active})`, value: "active" },
                                { label: `Disabled (${userStats.disabled})`, value: "disabled" },
                            ]}
                        />
                        <Button icon={<ReloadOutlined />} onClick={() => void loadUsers()} loading={isLoadingUsers}>
                            Refresh
                        </Button>
                    </Space>
                </div>
                <Space size={8} wrap className="existing-users-stats">
                    <Tag className="existing-users-stats__tag existing-users-stats__tag--total">Total: {userStats.total}</Tag>
                    <Tag className="existing-users-stats__tag existing-users-stats__tag--active">Active: {userStats.active}</Tag>
                    <Tag className="existing-users-stats__tag existing-users-stats__tag--disabled">Disabled: {userStats.disabled}</Tag>
                </Space>
                <Table<UserAccount>
                    className="existing-users-table"
                    rowKey={(record) => record.username}
                    loading={isLoadingUsers}
                    dataSource={filteredUsers}
                    size="middle"
                    pagination={{ pageSize: 8 }}
                    scroll={{ x: 960 }}
                    rowClassName={(record) => (record.is_active ? "" : "existing-users-table__row--inactive")}
                    locale={{ emptyText: users.length > 0 ? "No users match the current filters." : "No users found." }}
                    columns={[
                        {
                            title: "User",
                            dataIndex: "username",
                            key: "username",
                            render: (_, user) => {
                                const isSelf = normalizedCurrentUsername !== "" && normalizedCurrentUsername === user.username.toLowerCase();
                                return (
                                    <div className="existing-users-usercell">
                                        <span className="existing-users-usercell__avatar">
                                            <UserOutlined />
                                        </span>
                                        <div className="existing-users-usercell__meta">
                                            <Space size={8} wrap>
                                                <Text strong>{user.username}</Text>
                                                {isSelf ? <Tag color="blue">Current Session</Tag> : null}
                                            </Space>
                                            <Text type="secondary" className="existing-users-usercell__subtle">
                                                Created {formatDateTime(user.created_at)}
                                            </Text>
                                        </div>
                                    </div>
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
                                <Badge status={isActive ? "success" : "error"} text={isActive ? "Active" : "Disabled"} />
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
                                const isSelf = normalizedCurrentUsername !== "" && normalizedCurrentUsername === user.username.toLowerCase();
                                const isBusy = busyUserAction === user.username;
                                const disableToggleReason = isSelf && user.is_active
                                    ? "You cannot disable your currently signed-in account."
                                    : undefined;
                                const disableDeleteReason = isSelf
                                    ? "You cannot delete your currently signed-in account."
                                    : undefined;

                                return (
                                    <Space wrap size={8}>
                                        <Tooltip title={disableToggleReason}>
                                            <span>
                                                <Switch
                                                    checked={user.is_active}
                                                    checkedChildren="Active"
                                                    unCheckedChildren="Disabled"
                                                    loading={isBusy}
                                                    disabled={writeDisabled || isBusy || Boolean(disableToggleReason)}
                                                    onChange={(checked) => void handleSetActive(user, checked)}
                                                />
                                            </span>
                                        </Tooltip>
                                        <Button
                                            size="small"
                                            icon={<KeyOutlined />}
                                            onClick={() => openResetModal(user)}
                                            disabled={writeDisabled || isBusy}
                                        >
                                            Reset
                                        </Button>
                                        <Popconfirm
                                            title={`Delete user "${user.username}"?`}
                                            description="This action cannot be undone."
                                            okText="Delete"
                                            cancelText="Cancel"
                                            onConfirm={() => handleDeleteUser(user)}
                                            disabled={writeDisabled || isBusy || isSelf}
                                        >
                                            <Tooltip title={disableDeleteReason}>
                                                <span>
                                                    <Button
                                                        danger
                                                        size="small"
                                                        icon={<DeleteOutlined />}
                                                        loading={isBusy}
                                                        disabled={writeDisabled || isBusy || Boolean(disableDeleteReason)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </span>
                                            </Tooltip>
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
                        ]}
                    >
                        <Input.Password autoComplete="new-password" placeholder="Enter a temporary password" />
                    </Form.Item>
                </Form>
            </Modal>
        </Space>
    );
}
