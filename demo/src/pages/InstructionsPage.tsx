export default function InstructionsPage({ onStart }: { onStart: () => void }) {
    return (
        <div className="instructions-page">
            <div className="instructions-hero">
                <h1>🌶️ Motaba Masala Demo</h1>
                <p>Walk through the complete spice manufacturing workflow — from raw material procurement to finished goods dispatch. Every action is real and fully operational.</p>
            </div>

            {/* Visual Flow Diagram */}
            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>Business Workflow</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: '0.9rem' }}>This is how materials flow through the factory:</p>

            <div className="flow-diagram">
                <div className="flow-step" style={{ borderColor: 'var(--color-raw)' }}>
                    <span className="icon">⚙️</span>
                    <span className="label">Master Data</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Items, Recipes,<br />Suppliers</span>
                </div>
                <span className="flow-arrow">→</span>
                <div className="flow-step" style={{ borderColor: 'var(--color-info)' }}>
                    <span className="icon">📦</span>
                    <span className="label">Procurement</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>GRN, Lot<br />Tracking</span>
                </div>
                <span className="flow-arrow">→</span>
                <div className="flow-step" style={{ borderColor: 'var(--color-bulk)' }}>
                    <span className="icon">🏭</span>
                    <span className="label">Production</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Recipe Exec,<br />Yield Tracking</span>
                </div>
                <span className="flow-arrow">→</span>
                <div className="flow-step" style={{ borderColor: 'var(--color-success)' }}>
                    <span className="icon">📦</span>
                    <span className="label">Packing</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Bulk → Retail<br />Pack SKUs</span>
                </div>
                <span className="flow-arrow">→</span>
                <div className="flow-step" style={{ borderColor: 'var(--color-raw)' }}>
                    <span className="icon">🚛</span>
                    <span className="label">Dispatch</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Sales Orders,<br />FIFO</span>
                </div>
                <span className="flow-arrow">→</span>
                <div className="flow-step" style={{ borderColor: 'var(--color-primary)' }}>
                    <span className="icon">📊</span>
                    <span className="label">Reports</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Stock Ledger,<br />Valuation</span>
                </div>
            </div>

            {/* Worked Example */}
            <div className="example-section">
                <h3>📋 Walkthrough Example</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16 }}>Follow this step-by-step scenario to see the complete workflow in action:</p>

                <div className="example-step">
                    <span className="example-num">1</span>
                    <div>
                        <strong>Master Data (Pre-loaded)</strong>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            The demo comes with 5 raw materials (Chili Seeds, Coriander Seeds, Cumin Seeds, Turmeric Root, Black Pepper),
                            3 bulk powders, 4 packing materials, 4 finished goods, 3 recipes, 3 suppliers, and 3 customers.
                            You can add, edit, or delete any of these.
                        </p>
                    </div>
                </div>

                <div className="example-step">
                    <span className="example-num">2</span>
                    <div>
                        <strong>Procurement — Receive 200 KG Red Chili Seeds</strong>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Create a GRN (Goods Received Note) from "Raj Spice Farms". Enter 200 KG @ ₹125/KG.
                            Watch the stock increase from 500 → 700 KG, and the weighted average cost update accordingly.
                            A Lot Number is auto-generated for traceability.
                        </p>
                    </div>
                </div>

                <div className="example-step">
                    <span className="example-num">3</span>
                    <div>
                        <strong>Production — Make 95 KG Red Chili Powder</strong>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Select "Red Chili Powder" recipe → Create batch with 95 KG planned output.
                            The system shows you need ~100 KG Chili Seeds. Enter actual consumed: 100 KG, Output: 95 KG, Wastage: 5 KG.
                            Yield = 95%. Cost per KG = ₹(100×Avg Cost)/95.
                            Raw stock ↓ 100 KG, Bulk stock ↑ 95 KG.
                        </p>
                    </div>
                </div>

                <div className="example-step">
                    <span className="example-num">4</span>
                    <div>
                        <strong>Packing — Create 1000 × "Red Chili Powder 50g" Pouches</strong>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Select the completed batch as source. Pack into 50g pouches (1000 units = 50 KG bulk consumed).
                            System deducts 50 KG bulk powder + 1000 pouches + 1000 labels.
                            FG stock increases by 1000 pieces. FG cost = (Bulk cost per 50g) + (Pouch + Label cost).
                        </p>
                    </div>
                </div>

                <div className="example-step">
                    <span className="example-num">5</span>
                    <div>
                        <strong>Dispatch — Ship 500 Units to "Delhi Distributor Hub"</strong>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Create a dispatch note → Select 500 units of Red Chili Powder 50g @ ₹15/each.
                            FG stock decreases by 500. Total invoice value = ₹7,500. FIFO batch selection is automatic.
                        </p>
                    </div>
                </div>

                <div className="example-step">
                    <span className="example-num">6</span>
                    <div>
                        <strong>Reports — See Everything Come Together</strong>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            View the real-time Stock Ledger showing all items with quantity + value across all stages.
                            See production yield analysis, wastage tracking, and the complete transaction log.
                            The Grand Total Inventory Value updates in real-time as you operate.
                        </p>
                    </div>
                </div>
            </div>

            {/* Key Concepts */}
            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 12, marginTop: 32 }}>Key Concepts</h2>
            <div className="glossary">
                <div className="glossary-item">
                    <strong>GRN</strong>
                    <p>Goods Received Note — records incoming materials with quantity, price, and auto-generated lot number</p>
                </div>
                <div className="glossary-item">
                    <strong>BOM / Recipe</strong>
                    <p>Bill of Materials — defines ingredients and quantities needed to produce a specific bulk powder</p>
                </div>
                <div className="glossary-item">
                    <strong>Batch</strong>
                    <p>A production run that converts raw materials into bulk powder, with yield and wastage tracking</p>
                </div>
                <div className="glossary-item">
                    <strong>Packing Run</strong>
                    <p>Converts bulk powder into retail SKUs (e.g., 50g pouches), consuming packing materials</p>
                </div>
                <div className="glossary-item">
                    <strong>FIFO</strong>
                    <p>First In, First Out — oldest stock is dispatched first to minimize expiry risk</p>
                </div>
                <div className="glossary-item">
                    <strong>Weighted Avg Cost</strong>
                    <p>Running average purchase price that updates with each new receipt, used for inventory valuation</p>
                </div>
                <div className="glossary-item">
                    <strong>Yield %</strong>
                    <p>Actual output ÷ Input × 100 — measures production efficiency (higher = less waste)</p>
                </div>
                <div className="glossary-item">
                    <strong>Value Add</strong>
                    <p>As materials transform (Raw→Bulk→FG), the system tracks increasing value at each stage</p>
                </div>
            </div>

            {/* CTA */}
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <button className="btn btn-primary btn-lg" onClick={onStart} style={{ fontSize: '1.1rem', padding: '16px 48px' }}>
                    🚀 Start the Demo
                </button>
                <p style={{ color: 'var(--text-dim)', marginTop: 12, fontSize: '0.82rem' }}>
                    Tip: Watch the <strong>Live Stock sidebar</strong> on the right — it updates in real-time as you operate!
                </p>
            </div>
        </div>
    );
}
