import { useDemoContext } from '../data/DemoContext';
import { Card, Statistic, Tag, Divider, Typography, Progress } from 'antd';
import {
    InboxOutlined,
    ExperimentOutlined,
    ShoppingOutlined,
    GiftOutlined,
    DollarOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function StockSidebar() {
    const { state } = useDemoContext();

    // Aggregate stock by type
    const rawMaterials = state.stock.filter(s => s.type === 'RAW');
    const packingMaterials = state.stock.filter(s => s.type === 'PACKING');
    const bulkInhouse = state.stock.filter(s => s.type === 'BULK_INHOUSE');
    const finishedGoods = state.stock.filter(s => s.type === 'FINISHED_GOOD');

    const totalRaw = rawMaterials.reduce((sum, s) => sum + s.quantity, 0);
    const totalRawValue = rawMaterials.reduce((sum, s) => sum + s.value, 0);
    const totalPacking = packingMaterials.reduce((sum, s) => sum + s.quantity, 0);
    const totalPackValue = packingMaterials.reduce((sum, s) => sum + s.value, 0);
    const totalBulk = bulkInhouse.reduce((sum, s) => sum + s.quantity, 0);
    const totalBulkValue = bulkInhouse.reduce((sum, s) => sum + s.value, 0);
    const totalFG = finishedGoods.reduce((sum, s) => sum + s.quantity, 0);
    const totalFGValue = finishedGoods.reduce((sum, s) => sum + s.value, 0);
    const totalThirdParty = state.thirdPartyBulk.reduce((sum, s) => sum + s.quantity, 0);
    const totalTPValue = state.thirdPartyBulk.reduce((sum, s) => sum + s.value, 0);

    const totalInventoryValue = totalRawValue + totalPackValue + totalBulkValue + totalFGValue + totalTPValue;

    const sections = [
        {
            title: 'Raw Materials',
            icon: <InboxOutlined />,
            color: '#d4380d',
            quantity: `${totalRaw.toFixed(1)} KG`,
            value: totalRawValue,
            items: rawMaterials.filter(s => s.quantity > 0),
        },
        {
            title: 'Packing Materials',
            icon: <GiftOutlined />,
            color: '#d48806',
            quantity: `${totalPacking.toFixed(0)} PCS`,
            value: totalPackValue,
            items: packingMaterials.filter(s => s.quantity > 0),
        },
        {
            title: 'Bulk Powder (In-House)',
            icon: <ExperimentOutlined />,
            color: '#7c3aed',
            quantity: `${totalBulk.toFixed(1)} KG`,
            value: totalBulkValue,
            items: bulkInhouse.filter(s => s.quantity > 0),
        },
        {
            title: 'Bulk (3rd Party)',
            icon: <ExperimentOutlined />,
            color: '#0891b2',
            quantity: `${totalThirdParty.toFixed(1)} KG`,
            value: totalTPValue,
            items: state.thirdPartyBulk.filter(s => s.quantity > 0),
        },
        {
            title: 'Finished Goods',
            icon: <ShoppingOutlined />,
            color: '#16a34a',
            quantity: `${totalFG.toFixed(0)} PCS`,
            value: totalFGValue,
            items: finishedGoods.filter(s => s.quantity > 0),
        },
    ];

    return (
        <div className="stock-sidebar">
            <Card
                className="stock-total-card"
                style={{
                    background: 'linear-gradient(135deg, #7D1111 0%, #a01919 100%)',
                    border: 'none',
                    marginBottom: 16,
                }}
            >
                <Statistic
                    title={<span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Total Inventory Value</span>}
                    value={formatCurrency(totalInventoryValue)}
                    prefix={<DollarOutlined />}
                    valueStyle={{ color: '#fff', fontSize: 24, fontWeight: 700 }}
                />
            </Card>

            {sections.map((section) => (
                <Card
                    key={section.title}
                    size="small"
                    className="stock-section-card"
                    style={{ marginBottom: 12 }}
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: section.color, fontSize: 16 }}>{section.icon}</span>
                            <Text strong style={{ fontSize: 13 }}>{section.title}</Text>
                        </div>
                    }
                    extra={<Tag color={section.color} style={{ margin: 0 }}>{section.quantity}</Tag>}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Value</Text>
                        <Text strong style={{ fontSize: 13, color: section.color }}>{formatCurrency(section.value)}</Text>
                    </div>
                    {section.value > 0 && totalInventoryValue > 0 && (
                        <Progress
                            percent={Math.round((section.value / totalInventoryValue) * 100)}
                            size="small"
                            strokeColor={section.color}
                            showInfo={true}
                            style={{ marginBottom: 8 }}
                        />
                    )}
                    {section.items.length > 0 && (
                        <>
                            <Divider style={{ margin: '8px 0' }} />
                            <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                                {section.items.map(item => (
                                    <div key={item.itemId} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 11 }}>
                                        <Text type="secondary" ellipsis style={{ maxWidth: 140 }}>{item.itemName}</Text>
                                        <Text>{item.quantity.toFixed(item.unit === 'KG' ? 1 : 0)} {item.unit}</Text>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    {section.items.length === 0 && (
                        <Text type="secondary" italic style={{ fontSize: 11 }}>No stock</Text>
                    )}
                </Card>
            ))}
        </div>
    );
}
