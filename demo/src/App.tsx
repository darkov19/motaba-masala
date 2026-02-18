import { ConfigProvider, Steps, Button, Space, Typography, Layout, theme as antTheme, Tooltip } from 'antd';
import { DemoProvider, useDemoContext } from './data/DemoContext';
import StockSidebar from './components/StockSidebar';
import MasterDataStep from './steps/MasterDataStep';
import ProcurementStep from './steps/ProcurementStep';
import ProductionStep from './steps/ProductionStep';
import PackingStep from './steps/PackingStep';
import DispatchStep from './steps/DispatchStep';
import {
    DatabaseOutlined, ShoppingCartOutlined, ExperimentOutlined,
    BoxPlotOutlined, SendOutlined, ReloadOutlined,
    LeftOutlined, RightOutlined,
} from '@ant-design/icons';
import './App.css';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const STEPS = [
    { title: 'Master Data', icon: <DatabaseOutlined />, description: 'Items, Suppliers, Recipes' },
    { title: 'Procurement', icon: <ShoppingCartOutlined />, description: 'GRN & Purchases' },
    { title: 'Production', icon: <ExperimentOutlined />, description: 'Batch Manufacturing' },
    { title: 'Packing', icon: <BoxPlotOutlined />, description: 'Bulk → Retail Packs' },
    { title: 'Dispatch', icon: <SendOutlined />, description: 'Sales & Shipping' },
];

function DemoApp() {
    const { state, dispatch } = useDemoContext();

    const stepComponents = [
        <MasterDataStep key="master" />,
        <ProcurementStep key="procurement" />,
        <ProductionStep key="production" />,
        <PackingStep key="packing" />,
        <DispatchStep key="dispatch" />,
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header className="demo-header">
                <div className="header-brand">
                    <div className="brand-logo">M</div>
                    <div>
                        <Title level={4} style={{ margin: 0, color: '#fff', lineHeight: 1.2 }}>
                            Motaba Masala
                        </Title>
                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                            Inventory & Production Management — Demo
                        </Text>
                    </div>
                </div>
                <Tooltip title="Reset Demo — Clear all data">
                    <Button ghost icon={<ReloadOutlined />} onClick={() => dispatch({ type: 'RESET' })}>
                        Reset Demo
                    </Button>
                </Tooltip>
            </Header>

            <Layout>
                <Content style={{ padding: 24, overflow: 'auto' }}>
                    <div className="steps-nav">
                        <Steps
                            current={state.currentStep}
                            onChange={(step) => dispatch({ type: 'SET_STEP', step })}
                            items={STEPS.map((s, idx) => ({
                                title: s.title,
                                icon: s.icon,
                                description: s.description,
                                status: idx === state.currentStep ? 'process' : idx < state.currentStep ? 'finish' : 'wait',
                            }))}
                            style={{ marginBottom: 24 }}
                        />
                    </div>

                    <div className="step-container">
                        {stepComponents[state.currentStep]}
                    </div>

                    <div className="step-navigation">
                        <Button
                            size="large"
                            icon={<LeftOutlined />}
                            onClick={() => dispatch({ type: 'SET_STEP', step: Math.max(0, state.currentStep - 1) })}
                            disabled={state.currentStep === 0}
                        >
                            Previous
                        </Button>
                        <Space>
                            <Text type="secondary">
                                Step {state.currentStep + 1} of {STEPS.length}
                            </Text>
                        </Space>
                        <Button
                            type="primary"
                            size="large"
                            onClick={() => dispatch({ type: 'SET_STEP', step: Math.min(STEPS.length - 1, state.currentStep + 1) })}
                            disabled={state.currentStep === STEPS.length - 1}
                            style={{ background: '#7D1111', borderColor: '#7D1111' }}
                        >
                            Next <RightOutlined />
                        </Button>
                    </div>
                </Content>

                <Sider
                    width={300}
                    className="stock-sider"
                    theme="light"
                    style={{ background: '#fafafa', borderLeft: '1px solid #f0f0f0', padding: 16, overflow: 'auto' }}
                >
                    <Title level={5} style={{ marginBottom: 16 }}>
                        📊 Live Stock Dashboard
                    </Title>
                    <StockSidebar />
                </Sider>
            </Layout>
        </Layout>
    );
}

const motabaTheme = {
    token: {
        colorPrimary: '#7D1111',
        borderRadius: 8,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: 14,
        colorBgContainer: '#ffffff',
    },
    algorithm: antTheme.defaultAlgorithm,
};

export default function App() {
    return (
        <ConfigProvider theme={motabaTheme}>
            <DemoProvider>
                <DemoApp />
            </DemoProvider>
        </ConfigProvider>
    );
}
