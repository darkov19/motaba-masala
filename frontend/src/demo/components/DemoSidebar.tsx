import React from 'react';
import {
    HomeOutlined, DatabaseOutlined, InboxOutlined,
    ExperimentOutlined, ShopOutlined, GiftOutlined,
    TruckOutlined, BarChartOutlined, CheckCircleFilled,
} from '@ant-design/icons';
import { useDemo } from '../DemoContext';

const STEPS = [
    { key: 0, label: 'Welcome', icon: <HomeOutlined /> },
    { key: 1, label: 'Master Data', icon: <DatabaseOutlined /> },
    { key: 2, label: 'Goods Received (GRN)', icon: <InboxOutlined /> },
    { key: 3, label: 'Production Batch', icon: <ExperimentOutlined /> },
    { key: 4, label: 'Third-Party Bulk', icon: <ShopOutlined /> },
    { key: 5, label: 'Packing Run', icon: <GiftOutlined /> },
    { key: 6, label: 'Sales & Dispatch', icon: <TruckOutlined /> },
    { key: 7, label: 'Reports Dashboard', icon: <BarChartOutlined /> },
];

export default function DemoSidebar() {
    const { state, dispatch } = useDemo();
    const { currentStep, completedSteps } = state;

    const canNavigate = (step: number) =>
        step === 0 || completedSteps.includes(step) || step <= Math.max(0, ...completedSteps, 0) + 1;

    return (
        <div className="demo-sidebar">
            <div className="demo-sidebar-title">Workflow Steps</div>
            {STEPS.map(s => {
                const isActive = currentStep === s.key;
                const isCompleted = completedSteps.includes(s.key);
                const isDisabled = !canNavigate(s.key);

                return (
                    <div
                        key={s.key}
                        className={`demo-sidebar-item ${isActive ? 'active' : ''} ${isCompleted && !isActive ? 'completed' : ''} ${isDisabled ? 'disabled' : ''}`}
                        onClick={() => { if (!isDisabled) dispatch({ type: 'SET_STEP', step: s.key }); }}
                    >
                        <div className="demo-sidebar-icon">
                            {isCompleted && !isActive ? <CheckCircleFilled /> : s.icon}
                        </div>
                        {s.label}
                    </div>
                );
            })}
        </div>
    );
}
