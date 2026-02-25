# Masala Inventory Management — UX Design Specification

_Created on 2026-02-12 by darko_
_Generated using BMad Method - Create UX Design Workflow v1.0_

---

## Executive Summary

**Masala Inventory Management** is a comprehensive inventory and production management system for spice manufacturing, replacing manual Excel workflows with real-time digital tracking. The system provides instant visibility into stock value at every transformation stage (Raw Materials → Bulk Powder → Finished Goods), with automated loss tracking that reveals production inefficiencies.

**Target Users:**

- **Admin/Owner** — Full system access, valuation reports, business decisions. Needs "Command Center" view.
- **Data Entry Operator** — Focused execution. Enters GRNs, production batches, and dispatches. Needs "Task Focused" view.

**Platform:** On-premise Windows distributed desktop deployment over LAN (`Server.exe` + `Client.exe`, 4-5 concurrent users)

**Core Experience:** Real-time stock levels and valuation — users should always know exactly where things stand at every stage of the production pipeline.

**Desired Emotional Response:** In control & confident ("I know exactly where everything stands, no surprises") + Efficient & productive ("I got what I needed in seconds, back to work")

**UX Complexity:** Medium — 3 user roles, 5-6 primary user journeys (GRN, Production Batch, Packing, Dispatch, Stock View, Reporting), CRUD-heavy with domain-specific workflow logic (unit conversions, batch traceability, recipe engine). Standard interaction patterns apply — no novel UX mechanics needed.

**Facilitation Mode:** UX_EXPERT

### Inspiration Sources & Key UX Patterns

| Pattern                          | Source            | Application                                                             |
| -------------------------------- | ----------------- | ----------------------------------------------------------------------- |
| Color-coded status indicators    | Katana MRP        | Red/Green/Yellow for stock levels, batch status, QC                     |
| 5-second dashboard comprehension | inFlow            | Dashboard KPIs visible instantly without scrolling                      |
| Sidebar navigation by module     | Odoo              | Masters, Procurement, Production, Packing, Sales, Reports               |
| Widget-based role dashboards     | inFlow            | Each role sees their critical KPIs on login                             |
| Live value tracking              | Katana MRP        | Real-time ₹ value updates as materials transform                        |
| Keyboard-first data entry        | Industry standard | Tab-driven GRN/Dispatch forms, no mouse required                        |
| Scanner-ready input fields       | inFlow            | Text inputs with auto-focus and auto-advance for future barcode support |

---

## 1. Design System Foundation

### 1.1 Design System Choice

**Selected:** Ant Design (antd)
**Version:** 6.2.1
**Rationale:** Enterprise-grade component library purpose-built for data-heavy B2B applications

**Why Ant Design:**

- **Table component** — Industry-best data grid with sorting, filtering, pagination, fixed columns, expandable rows, and inline editing. This app is ~70% table views.
- **Form system** — Built-in validation, Tab-key navigation, label positioning — matches keyboard-first data entry requirement.
- **Professional aesthetic** — Structured, clean, "in control" feeling that matches the desired emotional response.
- **Comprehensive** — 60+ components covering every UI pattern needed (modals, drawers, notifications, menus, breadcrumbs, etc.)
- **Keyboard navigation** — Native Tab/Enter support across all interactive components.

**Components Provided by Ant Design:**

- Tables, Forms, Inputs, Select, DatePicker, InputNumber
- Button hierarchy (primary, default, dashed, text, link)
- Layout (Sider, Header, Content, Footer)
- Menu, Breadcrumb, Tabs, Steps
- Modal, Drawer, Popconfirm
- Notification, Message, Alert
- Card, Statistic, Tag, Badge
- Descriptions, List, Collapse

**Custom Components Needed:**

- Stock Level Indicator (color-coded gauge showing current vs. min/max levels)
- Value Tracker Card (real-time ₹ value with trend indicator)
- Batch Pipeline View (visual flow showing Raw → Bulk → FG transformation)
- Recipe Execution Panel (ingredient list with actual vs. expected quantities)

---

## 2. Core User Experience

### 2.1 Defining Experience

> **"One glance tells you exactly what you have, what it's worth, and where it is — Raw, Bulk, or Finished."**

The stock value pipeline view — seeing ₹ values flow from raw materials through production into finished goods — is what makes this different from a basic inventory counter. Users don't just see quantities; they see the financial reality of their factory in real-time.

**Core Interaction Pattern:** Dashboard → Drill-down

- **Dashboard** shows the high-level pipeline (Raw ₹X → Bulk ₹Y → FG ₹Z)
- **Click any stage** to see item-level breakdown
- **Click any item** to see batch-level detail with history

**Established UX Patterns Applied:**

- CRUD operations (Create, Read, Update, Delete) for all entities
- Form-based data entry (GRN, Batch Creation, Dispatch)
- Table-based data display (Stock Ledger, Reports)
- Dashboard with KPI cards and summary views
- Search and filter across all data

### 2.2 Novel UX Patterns

_No novel UX patterns required. Standard CRUD, dashboard, and form patterns apply with domain-specific customizations for unit conversion and batch traceability._

### 2.3 Core Experience Principles

| Principle       | Decision                                                                                                  | Rationale                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Speed**       | All key data visible in <2 seconds. Dashboard loads instantly. Forms submit with keyboard only.           | "Efficient & productive" — factory users have no patience for slow UIs           |
| **Guidance**    | Minimal hand-holding. Clean labels, logical flow, contextual help via tooltips only. No wizards.          | Expert users (factory managers) who repeat tasks daily — never obstruct the flow |
| **Flexibility** | Power users get keyboard shortcuts and bulk operations. No forced linear flows for data entry.            | Data Entry Operators enter 20+ GRNs/day — efficiency over safety rails           |
| **Feedback**    | Subtle confirmations (toast notifications). Red/Green color coding for status. No celebratory animations. | "In control" — the system confirms quietly, doesn't demand attention             |

---

## 3. Visual Foundation

### 3.1 Color System

### 3.1 Color System

**Selected Theme:** Motaba Modern Clean
**Primary Color:** Deep Maroon (`#7D1111`)
**Background:** Soft Grey (`#F8F9FA`)
**Font:** Inter (Google Fonts) — Tall, clean, digital-native.

**Visual Language:**

- **Cards:** Borderless white cards with soft shadows (`box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02)`).
- **Corners:** Friendly 16px border-radius on cards, buttons, and inputs.
- **Sidebar:** Floating white sidebar with modern light-mode aesthetic.

**Semantic Colors:**

- **Success (Stock OK):** `#52c41a` (Green)
- **Warning (Low Stock):** `#faad14` (Amber)
- **Error (Critical):** `#ff4d4f` (Red)
- **Info/Pending:** `#0ea5e9` (Sky Blue)

**Rationale:**

- **Modernity:** "Clean SaaS" aesthetic feels premium and up-to-date, boosting user confidence.
- **Legibility:** Inter font is superior for screen reading at small sizes.
- **Focus:** Removing heavy borders and using shadows draws attention to data, not containers.
- **Brand:** Deep Maroon still anchors the brand identity within a modern framework.

**Dark Mode Strategy:**

- Deferred for MVP. System structure (CSS variables) supports future "Factory Dark" mode.

**Interactive Visualizations:**

- Color Theme Explorer: [ux-color-themes.html](./ux-color-themes.html)

---

## 4. Design Direction

### 4.1 Chosen Design Approach

**Strategy: Functional Hybrid**

We will implement **one cohesive application shell** with **role-based variants** for entry experience and navigation behavior.

**1. Admin View (Modern Command Center)**

- **Goal:** Monitoring & Decision Making
- **Style:** "Modern Clean" — Soft shadows, ample whitespace, Inter font.
- **Key Features:**
    - Real-time Stock Value Pipeline (Raw ₹ → Bulk ₹ → Finished ₹)
    - KPI Cards with Sparkline trends
    - Modern Floating Sidebar
    - Borderless Critical Alert Tables

**2. Data Entry View (Speed Hub)**

- **Goal:** Speed & Execution
- **Style:** "Action Hub" — High contrast, large touch targets.
- **Key Features:**
    - Big "Quick Action" Buttons (New GRN, New Batch, Dispatch)
    - "Recent Transactions" list for quick checks
    - Simplified Icon-first Navigation
    - Keyboard-first forms for rapid data entry

**Rationale:**

- **Distinct Mental Models:** Admin needs a strategic overview (clean, calm); Data Entry needs a tactical tool (fast, robust).
- **Scalability:** Both views use the same Ant Design components, just styled differently via tokens.
- **Contract Consistency:** Both role variants are built on shared route IDs and module ownership defined in `docs/navigation-rbac-contract.md` (Story 2.2A), with shell behavior delivered in Story 2.2B.

**Interactive Mockups:**

- Final Design Showcase: [ux-design-directions.html](./ux-design-directions.html)

---

## 5. User Journey Flows

### 5.1 Critical User Paths

**Journey A: The "Morning Check" (Admin)**

1.  **Login** → Lands on _Command Center Dashboard_.
2.  **Scan KPI Cards:** Checks "Total Stock Value" and "Critical Alerts".
3.  **Drill Down:** Clicks "Low Stock" alert widget.
4.  **Review:** Sees list of items below min-level.
5.  **Decision:** Clicks "Create PO" action directly from the alert list.
    - _Feeling:_ "I know exactly what's wrong and I fixed it in 3 clicks."

**Journey B: The "Rapid GRN" (Data Entry)**

1.  **Login** → Lands on _Action Hub_.
2.  **Action:** Hits big "Receive Goods" button (or Keyboard Shortcut `Alt+G`).
3.  **Entry:** Focus is immediately on "Supplier" field.
4.  **Input:** Selects Supplier → Tabs to Item → Scans Barcode/Types Name → Tabs to Qty.
5.  **Submit:** Hits `Enter` to save. System auto-clears form for next item.
    - _Feeling:_ "Fast, rhythmic, no mouse hunting."

**Journey C: The "Batch Production" (Factory Manager/Data Entry)**

1.  **Navigation:** Selects "Production" from sidebar.
2.  **Action:** Clicks "New Batch".
3.  **Setup:** Selects Product (e.g., "Garam Masala 100g"). System auto-loads BOM.
4.  **Execution:** Enters "Batch Size" (e.g., 500kg). System calculates required raw materials.
5.  **Validation:** System warns if raw material stock is insufficient (Red alert).
6.  **Commit:** User confirms. Raw material stock deducts; Bulk stock increases (Work-in-Progress).
    - _Feeling:_ "The system stopped me from making a mistake."

### 5.2 Resilience Components

These components provide visual feedback and recovery options for system stability.

1.  **Connection Status Indicator:**
    - **Visual:** Small dot in Header (Right). 🟢 Green = Online, 🔴 Red = Offline.
    - **Behavior:** Real-time ping. Hover shows "Connected to Server (12ms)" or "Disconnected".

2.  **Reconnection Overlay:**
    - **Visual:** Full-screen modal with semi-transparent dark background.
    - **Content:** "Connection Lost. Attempting to reconnect..." + [Retry Now] button.
    - **Behavior:** Auto-retries every 3s. Dismisses automatically when connection restores.

3.  **Draft Recovery Dialog:**
    - **Trigger:** User opens a form (e.g., GRN) that has a saved local draft.
    - **Content:** "You have an unsaved draft from [Time]. Resume?"
    - **Actions:** [Resume Draft] (Primary), [Discard] (Secondary).

4.  **Unsaved Changes Warning:**
    - **Trigger:** User clicks Back/Menu/Close while form is dirty.
    - **Visual:** Blocking Modal. "You have unsaved changes. Leave anyway?"
    - **Actions:** [Stay] (Primary), [Leave] (Destructive).

5.  **Warning Banners:**
    - **Visual:** Persistent colored bar below Header.
    - **Types:**
        - 🟠 **Disk Space:** "Low Disk Space (< 500MB). Free up space to prevent data loss."
        - 🟠 **License:** "License expires in X days. Renew now."
        - 🔴 **Expired:** "License Expired. Read-only mode active."

6.  **Hardware Change Error Screen:**
    - **Visual:** Full-screen blocking error.
    - **Content:** "Hardware ID Mismatch. Application is locked."
    - **Action:** [Copy Hardware ID] button to send to support.

---

## 6. Component Library

### 6.1 Component Strategy

**Core Library:** Ant Design 6.2.1
**Icons:** Ant Design Icons
**Typography:** **Inter** (Google Fonts) for UI, **JetBrains Mono** for code/ID fields.

**Visual Style Overrides (Modern Clean):**

- **Border Radius:** `16px` (Cards, Inputs, Buttons)
- **Shadows:** Soft, diffused shadows (`box-shadow: 0 4px 12px rgba(0,0,0,0.05)`) instead of borders.
- **Tables:** "Separate" style (rows have spacing between them) for better readability.

**Key Components & Usage:**

- **Table:** Modern clean variant. Rows are cards.
- **Card:** Borderless, shadow-lifted.
- **Statistic:** Large, bold fonts for numbers.
- **Tag:** Pill-shaped, soft pastel backgrounds (`bg-green-100 text-green-700`).
- **Button:** Tall, pill-shaped or rounded-rect (`h-40px`, `radius-8px`).

---

## 7. UX Pattern Decisions

### 7.1 Consistency Rules

**Navigation Pattern:**

- **Admin:** Collapsible Sidebar (Left) with full menu tree.
- **Data Entry:** Simplified Sidebar (Icons only or limited menu) to reduce cognitive load.
- **Shared Contract:** Both variants use the same underlying route IDs and RBAC checks; the difference is presentation density, not route ownership.

**Data Display:**

- **Density:** High. Use compact tables. Avoid excessive whitespace.
- **Numbers:** Right-aligned, monospaced digits.
- **Dates:** `DD-MMM-YYYY` format (e.g., 12-Feb-2026) to avoid confusion.
- **Currency:** `₹ XX,XX,XXX` (Indian Numbering System format).

**Feedback Loop:**

- **Success:** Non-blocking Toast notification (`message.success("Batch Created")`) top-center.
- **Error:** Inline form validation text (Red).
- **Critical:** Blocking Modal alert.
- **Loading:** Skeleton loaders for initial page load; Button spinners for form submission.

**Input Experience:**

- **Auto-focus:** First field focuses on page load.
- **Tab Order:** Logical flow (Top-Left → Bottom-Right).
- **Scanner:** Input fields for items must accept rapid barcode input (simulated keystrokes).

---

## 8. Responsive Design & Accessibility

### 8.1 Responsive Strategy

**Scope:** Desktop & Laptop Browsers (1280px+ width).
_Note: Tablets are secondary, but Ant Design's grid system will naturally stack columns on smaller screens (768px-1024px)._

**Breakpoint Strategy:**

- **1200px+ (XL):** 3-column dashboard, Full tables.
- **992px (LG):** 2-column dashboard, Tables with horizontal scroll if needed.
- **<768px:** Not supported for primary workflow (per PRD "Desktop/Laptop only").

**Accessibility (a11y):**

- **Contrast:** High contrast theme (Maroon/White) meets WCAG AA.
- **Keyboard:** Full keyboard navigability (Ant Design native).
- **Focus:** Visible focus states for all interactive elements.
- **Screen Reader:** ARIA labels on all icon-only buttons.

---

## 9. Implementation Guidance

### 9.1 Completion Summary

This UX Design Specification defines a **high-efficiency, factory-first inventory system** tailored for Motaba.

**Five Pillars of the Design:**

1.  **Visual Identity:** "Modern Clean" theme features **Inter font**, **soft shadows**, and **borderless cards** for a premium, high-confidence feel.
2.  **Role-Based Interaction:** Distinct landing experiences for Admin (Modern Dashboard) vs. Data Entry (Speed Hub).
3.  **Real-Time Value:** Focus on ₹ Value Pipeline (Raw → FG) distinguishes this from simple stock counting tools.
4.  **Speed First:** Keyboard-driven forms, scanner-ready inputs, and compact tables prioritize operator efficiency.
5.  **Scalable Foundation:** Built on Ant Design 6.2.1, ensuring robust components for future growth without design debt.

**Next Steps:**

- Handover to Development Team
- Setup Ant Design Repo with Custom Theme Config
- Build "Skeleton" versions of the Admin Dashboard and Action Hub first.

---

## Appendix

### Related Documents

- Product Requirements: `docs/PRD.md`
- Product Brief: `docs/product-brief.md`

### Core Interactive Deliverables

This UX Design Specification was created through visual collaboration:

- **Color Theme Visualizer**: docs/ux-color-themes.html
    - Interactive HTML showing all color theme options explored
    - Live UI component examples in each theme
    - Side-by-side comparison and semantic color usage

- **Design Direction Mockups**: docs/ux-design-directions.html
    - Interactive HTML with 6-8 complete design approaches
    - Full-screen mockups of key screens
    - Design philosophy and rationale for each direction

### Version History

| Date       | Version | Changes                         | Author |
| ---------- | ------- | ------------------------------- | ------ |
| 2026-02-12 | 1.0     | Initial UX Design Specification | darko  |

---

_This UX Design Specification was created through collaborative design facilitation, not template generation. All decisions were made with user input and are documented with rationale._
