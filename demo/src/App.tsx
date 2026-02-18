import { useState, createContext, useContext, useCallback, useEffect, useRef } from 'react';
import { DemoData } from './types';
import { loadData, resetDemo, getItemsByType, getValueByType, getTotalValue } from './store/demoStore';
import InstructionsPage from './pages/InstructionsPage';
import MasterDataPage from './pages/MasterDataPage';
import ProcurementPage from './pages/ProcurementPage';
import ProductionPage from './pages/ProductionPage';
import PackingPage from './pages/PackingPage';
import DispatchPage from './pages/DispatchPage';
import ReportingPage from './pages/ReportingPage';

// Context
interface DemoCtx { data: DemoData; setData: (d: DemoData) => void; toast: (msg: string, type?: string) => void; }
const DemoContext = createContext<DemoCtx>({} as DemoCtx);
export const useDemo = () => useContext(DemoContext);

const STEPS = [
    { id: 'instructions', label: 'Instructions', num: 0 },
    { id: 'master', label: 'Master Data', num: 1 },
    { id: 'procurement', label: 'Procurement', num: 2 },
    { id: 'production', label: 'Production', num: 3 },
    { id: 'packing', label: 'Packing', num: 4 },
    { id: 'dispatch', label: 'Dispatch', num: 5 },
    { id: 'reporting', label: 'Reports', num: 6 },
];

function App() {
    const [data, setDataState] = useState<DemoData>(loadData);
    const [step, setStep] = useState(0);
    const [toastMsg, setToastMsg] = useState<{ msg: string; type: string } | null>(null);

    const setData = useCallback((d: DemoData) => { setDataState(d); }, []);

    const toast = useCallback((msg: string, type = 'success') => {
        setToastMsg({ msg, type });
        setTimeout(() => setToastMsg(null), 3000);
    }, []);

    const handleReset = () => {
        if (confirm('Reset all demo data to initial state?')) {
            setData(resetDemo());
            setStep(0);
            toast('Demo reset to initial state', 'info');
        }
    };

    // Scrollbar hide/show logic
    useEffect(() => {
        const handleScroll = (e: Event) => {
            const el = e.target as HTMLElement;
            if (el.classList.contains('app-content') || el.classList.contains('stock-sidebar')) {
                el.classList.add('is-scrolling');
                const timeoutId = (el as any)._scrollTimeout;
                if (timeoutId) clearTimeout(timeoutId);
                (el as any)._scrollTimeout = setTimeout(() => {
                    el.classList.remove('is-scrolling');
                }, 1000);
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            const containers = document.querySelectorAll('.app-content, .stock-sidebar');
            containers.forEach(el => {
                const rect = el.getBoundingClientRect();
                const isOverEdge = e.clientX >= rect.right - 12 && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom;

                if (isOverEdge) {
                    el.classList.add('is-hovering-scrollbar');
                } else {
                    el.classList.remove('is-hovering-scrollbar');
                }
            });
        };

        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    const rawItems = getItemsByType(data, 'RAW');
    const bulkItems = getItemsByType(data, 'BULK');
    const packItems = getItemsByType(data, 'PACKING');
    const fgItems = getItemsByType(data, 'FG');

    const renderPage = () => {
        switch (step) {
            case 0: return <InstructionsPage onStart={() => setStep(1)} />;
            case 1: return <MasterDataPage />;
            case 2: return <ProcurementPage />;
            case 3: return <ProductionPage />;
            case 4: return <PackingPage />;
            case 5: return <DispatchPage />;
            case 6: return <ReportingPage />;
            default: return null;
        }
    };

    const formatCurrency = (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    return (
        <DemoContext.Provider value={{ data, setData, toast }}>
            <div className="app-container">
                {/* Header */}
                <header className="app-header">
                    <div className="app-logo">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="24" height="24" rx="6" fill="var(--color-primary)" />
                            <path d="M7 8h10M7 12h10M7 16h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <h1>Motaba Masala</h1>
                        <span className="badge">DEMO</span>
                    </div>
                    <div className="btn-group">
                        <button className="btn btn-outline btn-sm" onClick={handleReset}>Reset Demo</button>
                    </div>
                </header>

                {/* Stepper */}
                <nav className="stepper">
                    {STEPS.map((s, i) => (
                        <div
                            key={s.id}
                            className={`stepper-item ${step === i ? 'active' : ''} ${i < step ? 'completed' : ''}`}
                            onClick={() => setStep(i)}
                        >
                            <span className="step-num">{i < step ? '✓' : i + 1}</span>
                            <span>{s.label}</span>
                        </div>
                    ))}
                </nav>

                {/* Main Content */}
                <div className="app-main">
                    <div className="app-content">
                        {renderPage()}
                    </div>

                    {/* Stock Sidebar */}
                    {step > 0 && (
                        <aside className="stock-sidebar">
                            <div className="sidebar-title">Live Stock</div>

                            <div className="sidebar-section">
                                <div className="sidebar-section-title"><span className="type-dot raw"></span>Raw Materials</div>
                                {rawItems.map(it => (
                                    <div key={it.id} className={`sidebar-item ${it.currentStock <= it.reorderLevel ? 'low-stock' : ''}`}>
                                        <span>{it.name}</span>
                                        <span>
                                            <span className="qty">{it.currentStock}</span>
                                            <span className="val"> {it.baseUnit}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="sidebar-section">
                                <div className="sidebar-section-title"><span className="type-dot bulk"></span>Bulk Powders</div>
                                {bulkItems.map(it => (
                                    <div key={it.id} className="sidebar-item">
                                        <span>{it.name}</span>
                                        <span>
                                            <span className="qty">{it.currentStock}</span>
                                            <span className="val"> {it.baseUnit}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="sidebar-section">
                                <div className="sidebar-section-title"><span className="type-dot packing"></span>Packing Materials</div>
                                {packItems.map(it => (
                                    <div key={it.id} className={`sidebar-item ${it.currentStock <= it.reorderLevel ? 'low-stock' : ''}`}>
                                        <span>{it.name}</span>
                                        <span>
                                            <span className="qty">{it.currentStock.toLocaleString()}</span>
                                            <span className="val"> {it.baseUnit}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="sidebar-section">
                                <div className="sidebar-section-title"><span className="type-dot fg"></span>Finished Goods</div>
                                {fgItems.map(it => (
                                    <div key={it.id} className="sidebar-item">
                                        <span>{it.name}</span>
                                        <span>
                                            <span className="qty">{it.currentStock.toLocaleString()}</span>
                                            <span className="val"> {it.baseUnit}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="sidebar-section" style={{ marginTop: 16 }}>
                                <div className="sidebar-section-title">Inventory Value</div>
                                <div className="sidebar-item"><span>Raw Materials</span><span className="currency">{formatCurrency(getValueByType(data, 'RAW'))}</span></div>
                                <div className="sidebar-item"><span>Bulk Powders</span><span className="currency">{formatCurrency(getValueByType(data, 'BULK'))}</span></div>
                                <div className="sidebar-item"><span>Packing</span><span className="currency">{formatCurrency(getValueByType(data, 'PACKING'))}</span></div>
                                <div className="sidebar-item"><span>Finished Goods</span><span className="currency">{formatCurrency(getValueByType(data, 'FG'))}</span></div>
                                <div className="sidebar-total">
                                    <span>Total</span>
                                    <span className="amount">{formatCurrency(getTotalValue(data))}</span>
                                </div>
                            </div>
                        </aside>
                    )}
                </div>

                {/* Toast */}
                {toastMsg && <div className={`toast toast-${toastMsg.type}`}>{toastMsg.msg}</div>}
            </div>
        </DemoContext.Provider>
    );
}

export default App;
