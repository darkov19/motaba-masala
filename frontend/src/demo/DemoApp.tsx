import React from 'react';
import { ConfigProvider } from 'antd';
import { DemoProvider, useDemo } from './DemoContext';
import DemoHeader from './components/DemoHeader';
import DemoSidebar from './components/DemoSidebar';
import LiveDashboard from './components/LiveDashboard';
import WelcomeStep from './steps/WelcomeStep';
import MastersStep from './steps/MastersStep';
import GRNStep from './steps/GRNStep';
import ProductionStep from './steps/ProductionStep';
import ThirdPartyStep from './steps/ThirdPartyStep';
import PackingStep from './steps/PackingStep';
import DispatchStep from './steps/DispatchStep';
import ReportsStep from './steps/ReportsStep';
import './styles/demo.css';

const STEP_COMPONENTS: Record<number, React.FC> = {
    0: WelcomeStep,
    1: MastersStep,
    2: GRNStep,
    3: ProductionStep,
    4: ThirdPartyStep,
    5: PackingStep,
    6: DispatchStep,
    7: ReportsStep,
};

function DemoContent() {
    const { state } = useDemo();
    const StepComponent = STEP_COMPONENTS[state.currentStep] ?? WelcomeStep;

    return (
        <div className="demo-root">
            <DemoHeader />
            <div className="demo-body">
                <DemoSidebar />
                <div className="demo-content">
                    <StepComponent />
                </div>
            </div>
            <LiveDashboard />
        </div>
    );
}

export default function DemoApp() {
    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#7D1111',
                    borderRadius: 8,
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                },
            }}
        >
            <DemoProvider>
                <DemoContent />
            </DemoProvider>
        </ConfigProvider>
    );
}
