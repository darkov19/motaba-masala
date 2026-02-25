import { Menu, Space, Typography } from "antd";
import type { MenuProps } from "antd";
import { getNavigationByRole, type UserRole } from "./rbac";

const { Text } = Typography;

type RoleShellNavigationProps = {
    role: UserRole;
    activeRouteId: string;
    onNavigate: (routeId: string) => void;
};

export function RoleShellNavigation({ role, activeRouteId, onNavigate }: RoleShellNavigationProps) {
    const sections = getNavigationByRole(role);

    const items: MenuProps["items"] = sections.map(section => ({
        key: section.module,
        label: section.moduleLabel,
        type: "group",
        children: section.routes.map(route => ({
            key: route.id,
            label: route.label,
        })),
    }));

    return (
        <Space orientation="vertical" size={8} style={{ width: "100%" }}>
            <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {role === "admin" ? "Admin Shell" : "Operator Shell"}
            </Text>
            <Menu
                mode="inline"
                items={items}
                selectedKeys={[activeRouteId]}
                onClick={({ key }) => onNavigate(String(key))}
                style={{ borderInlineEnd: 0, background: "transparent" }}
            />
        </Space>
    );
}
