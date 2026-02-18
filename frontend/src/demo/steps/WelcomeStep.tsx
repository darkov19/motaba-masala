import React from 'react';
import { Button, Typography } from 'antd';
import { RocketOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useDemo } from '../DemoContext';

const { Title, Paragraph } = Typography;

export default function WelcomeStep() {
    const { dispatch } = useDemo();

    const goNext = () => {
        dispatch({ type: 'COMPLETE_STEP', step: 0 });
        dispatch({ type: 'SET_STEP', step: 1 });
    };

    const flowNodes = [
        { icon: '📦', label: 'Raw Materials' },
        { icon: '🏭', label: 'Production' },
        { icon: '🧪', label: 'Bulk Powder' },
        { icon: '📋', label: 'Packing' },
        { icon: '🎁', label: 'Finished Goods' },
        { icon: '🚚', label: 'Dispatch' },
    ];

    return (
        <div className="demo-step-card">
            <div className="demo-welcome-hero">
                <Title style={{ fontSize: 36, fontWeight: 800, color: '#7D1111', marginBottom: 8 }}>
                    🌶️ Masala Inventory Management
                </Title>
                <Paragraph style={{ fontSize: 17, color: '#666', maxWidth: 600, margin: '0 auto 8px' }}>
                    A comprehensive inventory and production management system designed for spice manufacturing.
                </Paragraph>
                <Paragraph style={{ fontSize: 14, color: '#999', maxWidth: 520, margin: '0 auto 32px' }}>
                    This interactive demo walks you through the complete business workflow — from receiving
                    raw spices to dispatching finished products to your customers.
                </Paragraph>

                <div className="demo-flow-diagram">
                    {flowNodes.map((n, i) => (
                        <React.Fragment key={n.label}>
                            {i > 0 && <span className="demo-flow-arrow">→</span>}
                            <div className="demo-flow-node">
                                <div className="icon">{n.icon}</div>
                                <div className="label">{n.label}</div>
                            </div>
                        </React.Fragment>
                    ))}
                </div>

                <div style={{ margin: '36px 0 16px' }}>
                    <Title level={5} style={{ color: '#333', marginBottom: 16 }}>What You'll Experience</Title>
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {[
                            { icon: '📊', t: 'Real-Time Valuation', d: 'See stock value update live as materials transform' },
                            { icon: '🔄', t: 'Full Traceability', d: 'Track every batch from raw material to finished good' },
                            { icon: '📉', t: 'Loss Tracking', d: 'Automatic wastage & yield calculations' },
                            { icon: '🏪', t: 'Third-Party Flow', d: 'Backup procurement when production is down' },
                        ].map(f => (
                            <div key={f.t} style={{ background: '#FAFAFA', borderRadius: 12, padding: '16px 20px', width: 200, textAlign: 'left' }}>
                                <div style={{ fontSize: 24, marginBottom: 6 }}>{f.icon}</div>
                                <div style={{ fontWeight: 600, fontSize: 13, color: '#333', marginBottom: 4 }}>{f.t}</div>
                                <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{f.d}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <Button type="primary" size="large" icon={<RocketOutlined />} onClick={goNext}
                    style={{ height: 48, fontSize: 16, fontWeight: 600, borderRadius: 12, marginTop: 24, paddingInline: 36 }}>
                    Start Demo <ArrowRightOutlined />
                </Button>
            </div>
        </div>
    );
}
