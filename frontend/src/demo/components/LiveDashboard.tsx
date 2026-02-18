import React from 'react';
import { useDemo } from '../DemoContext';
import { formatCurrency } from '../data/calculations';

export default function LiveDashboard() {
    const { stockSummary } = useDemo();

    const items = [
        { label: '📦 Raw Materials', value: stockSummary.raw },
        { label: '🏭 Bulk Powder', value: stockSummary.bulk },
        { label: '📋 Packing', value: stockSummary.packing },
        { label: '🎁 Finished Goods', value: stockSummary.fg },
    ];

    return (
        <div className="demo-live-bar">
            {items.map((it, i) => (
                <React.Fragment key={it.label}>
                    {i > 0 && <div className="demo-live-divider" />}
                    <div className="demo-live-item">
                        <div className="demo-live-label">{it.label}</div>
                        <div className="demo-live-value">{formatCurrency(it.value)}</div>
                    </div>
                </React.Fragment>
            ))}
            <div className="demo-live-divider" />
            <div className="demo-live-total">
                <div className="demo-live-label">💰 Total Inventory</div>
                <div className="demo-live-value">{formatCurrency(stockSummary.total)}</div>
            </div>
        </div>
    );
}
