import React from 'react';
import { Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useDemo } from '../DemoContext';

export default function DemoHeader() {
    const { dispatch } = useDemo();

    return (
        <div className="demo-header">
            <div className="demo-header-title">
                🌶️ Masala Inventory Management
                <span className="demo-header-badge">Interactive Demo</span>
            </div>
            <Button
                size="small"
                ghost
                icon={<ReloadOutlined />}
                onClick={() => { dispatch({ type: 'RESET' }); dispatch({ type: 'SET_STEP', step: 0 }); }}
                style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
            >
                Reset Demo
            </Button>
        </div>
    );
}
