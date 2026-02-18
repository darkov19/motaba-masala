import { useState } from "react";
import { Layout, Segmented, Typography } from "antd";
import DemoApp from "./demo/DemoApp";
import DemoGuide from "./demo/DemoGuide";
import "./App.css";

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

function App() {
    const [activeView, setActiveView] = useState<"console" | "guide">(
        "console",
    );

    return (
        <Layout className="root-layout">
            <Header className="app-header">
                <div>
                    <Title level={4} className="app-title">
                        Motaba Masala - Client Demo
                    </Title>
                    <Text className="app-subtitle">
                        Isolated, localStorage-backed, end-to-end business
                        workflow demo
                    </Text>
                </div>
                <Segmented
                    value={activeView}
                    options={[
                        { label: "Demo Console", value: "console" },
                        { label: "Instruction Guide", value: "guide" },
                    ]}
                    onChange={value =>
                        setActiveView(value as "console" | "guide")
                    }
                />
            </Header>
            <Content className="app-content">
                {activeView === "console" ? <DemoApp /> : <DemoGuide />}
            </Content>
            <Footer className="app-footer">
                Demo module is isolated in
                <code> frontend/src/demo/ </code> and does not access
                production DB/files.
            </Footer>
        </Layout>
    );
}

export default App;
