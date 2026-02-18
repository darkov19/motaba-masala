import { NavLink, Outlet } from 'react-router-dom';
import {
    DatabaseOutlined,
    ShoppingCartOutlined,
    ExperimentOutlined,
    InboxOutlined,
    CarOutlined,
    DashboardOutlined,
} from '@ant-design/icons';

const navItems = [
    { to: '/master-data', label: 'Master Data', icon: <DatabaseOutlined />, step: 1 },
    { to: '/procurement', label: 'Procurement', icon: <ShoppingCartOutlined />, step: 2 },
    { to: '/production', label: 'Production', icon: <ExperimentOutlined />, step: 3 },
    { to: '/packing', label: 'Packing', icon: <InboxOutlined />, step: 4 },
    { to: '/dispatch', label: 'Dispatch', icon: <CarOutlined />, step: 5 },
    { to: '/', label: 'Dashboard', icon: <DashboardOutlined />, step: 6 },
];

export default function Layout() {
    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <h1>Motaba Masala</h1>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="brand-sub">Inventory Demo</span>
                        <span style={{
                            fontSize: '0.65rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--text-muted)'
                        }}>demo/d4</span>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            className={({ isActive }) =>
                                `sidebar-nav-item ${isActive ? 'active' : ''}`
                            }
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span>{item.label}</span>
                            <span className="nav-step">{item.step}</span>
                        </NavLink>
                    ))}
                </nav>
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        Demo v1.0 • Client Preview
                    </div>
                </div>
            </aside>

            {/* Content */}
            <main className="content-area">
                <Outlet />
            </main>
        </div>
    );
}
