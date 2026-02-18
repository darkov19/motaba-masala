import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme as antTheme } from 'antd';
import { DemoProvider } from './data/DemoContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MasterData from './pages/MasterData';
import Procurement from './pages/Procurement';
import Production from './pages/Production';
import Packing from './pages/Packing';
import Dispatch from './pages/Dispatch';
import './styles/index.css';

const themeConfig = {
  algorithm: antTheme.darkAlgorithm,
  token: {
    colorPrimary: '#7D1111',
    colorBgContainer: '#1C1F2E',
    colorBgElevated: '#242838',
    colorBorder: 'rgba(255,255,255,0.08)',
    colorText: '#F0F0F5',
    colorTextSecondary: '#9CA3AF',
    borderRadius: 8,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 13,
  },
  components: {
    Table: {
      headerBg: '#161922',
      rowHoverBg: '#242838',
      borderColor: 'rgba(255,255,255,0.06)',
    },
    Card: {
      colorBgContainer: '#1C1F2E',
    },
    Modal: {
      contentBg: '#1C1F2E',
      headerBg: '#1C1F2E',
    },
    Input: {
      colorBgContainer: '#161922',
    },
    InputNumber: {
      colorBgContainer: '#161922',
    },
    Select: {
      colorBgContainer: '#161922',
    },
    Tabs: {
      inkBarColor: '#7D1111',
      itemActiveColor: '#A52222',
      itemSelectedColor: '#A52222',
    },
  },
};

export default function App() {
  return (
    <ConfigProvider theme={themeConfig}>
      <DemoProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/master-data" element={<MasterData />} />
              <Route path="/procurement" element={<Procurement />} />
              <Route path="/production" element={<Production />} />
              <Route path="/packing" element={<Packing />} />
              <Route path="/dispatch" element={<Dispatch />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </DemoProvider>
    </ConfigProvider>
  );
}
