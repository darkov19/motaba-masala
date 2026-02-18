import { Card, Col, Row, Statistic } from "antd";
import type { DemoKpi, Persona } from "../types";

type Props = {
    kpi: DemoKpi | null;
    persona: Persona;
};

export default function KpiCards({ kpi, persona }: Props) {
    if (!kpi) {
        return null;
    }

    const showValuation = persona === "admin";

    return (
        <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} lg={6}>
                <Card>
                    <Statistic title="Raw Stock (kg)" value={kpi.raw_quantity_kg} />
                </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <Card>
                    <Statistic title="Bulk Stock (kg)" value={kpi.bulk_quantity_kg} />
                </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <Card>
                    <Statistic title="FG Stock (pcs)" value={kpi.fg_quantity_pcs} />
                </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <Card>
                    <Statistic
                        title="Wastage %"
                        value={kpi.wastage_percent}
                        precision={2}
                    />
                </Card>
            </Col>
            {showValuation ? (
                <>
                    <Col xs={24} sm={12} lg={8}>
                        <Card>
                            <Statistic
                                title="Raw Value"
                                value={kpi.raw_value}
                                prefix="INR"
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <Card>
                            <Statistic
                                title="Bulk Value"
                                value={kpi.bulk_value}
                                prefix="INR"
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <Card>
                            <Statistic
                                title="FG Value"
                                value={kpi.fg_value}
                                prefix="INR"
                            />
                        </Card>
                    </Col>
                </>
            ) : null}
        </Row>
    );
}
