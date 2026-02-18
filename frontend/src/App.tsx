import { useState } from "react";
import { Layout, Typography, Input, Button, Space, Card, Divider } from "antd";
import { RocketOutlined, ArrowDownOutlined } from "@ant-design/icons";
import logo from "./assets/images/logo-universal.png";
import "./App.css";
// Note: Greet path will be updated once wails generates the JS bindings
// import {Greet} from "../wailsjs/go/app/App";

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

function App() {
    const [resultText, setResultText] = useState(
        "Please enter your name below:",
    );
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    const greet = () => {
        setLoading(true);
        // Simulate or call Greet when bindings are ready
        setTimeout(() => {
            setResultText(
                `Hello ${name || "Guest"}, Welcome to Masala Inventory!`,
            );
            setLoading(false);
        }, 500);
    };

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Header
                style={{
                    display: "flex",
                    alignItems: "center",
                    background: "#7D1111",
                    padding: "0 24px",
                }}
            >
                <img
                    src={logo}
                    style={{ height: 32, marginRight: 16 }}
                    alt="logo"
                />
                <Title level={4} style={{ color: "#fff", margin: 0 }}>
                    Masala Inventory Management
                </Title>
                <span
                    style={{
                        marginLeft: 12,
                        backgroundColor: "rgba(255, 255, 255, 0.15)",
                        color: "#fff",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: "0.75rem",
                        fontFamily: "monospace",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                >
                    demo/D2
                </span>
            </Header>
            <Content style={{ padding: "24px 50px" }}>
                <div style={{ maxWidth: 600, margin: "0 auto" }}>
                    <Card
                        bordered={false}
                        style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    >
                        <Space
                            direction="vertical"
                            size="large"
                            style={{ width: "100%" }}
                        >
                            <Title level={2} style={{ textAlign: "center" }}>
                                Project Initialization
                            </Title>
                            <Text
                                type="secondary"
                                style={{
                                    textAlign: "center",
                                    display: "block",
                                }}
                            >
                                This is a Wails + React + Ant Design baseline.
                            </Text>
                            <Divider />
                            <div
                                style={{
                                    textAlign: "center",
                                    fontSize: "1.2rem",
                                    padding: "20px 0",
                                }}
                            >
                                {resultText}{" "}
                                <ArrowDownOutlined
                                    style={{ color: "#7D1111" }}
                                />
                            </div>
                            <Space.Compact style={{ width: "100%" }}>
                                <Input
                                    size="large"
                                    placeholder="Enter your name"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    onPressEnter={greet}
                                />
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<RocketOutlined />}
                                    onClick={greet}
                                    loading={loading}
                                >
                                    Greet
                                </Button>
                            </Space.Compact>
                        </Space>
                    </Card>
                </div>
            </Content>
            <Footer style={{ textAlign: "center" }}>
                Masala Inventory Management ©2026 Developed with BMAD
            </Footer>
        </Layout>
    );
}

export default App;
