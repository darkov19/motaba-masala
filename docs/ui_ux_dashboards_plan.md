# Modern UX Plan: Role-Specific Dashboards

## Current State Analysis

Currently, the application relies on a single `dashboard` view in `App.tsx` that uses an `if/else` statement to render basic placeholder KPI cards depending on whether the user is an `admin` or an `operator`. It lacks actual data integration and does not act as a functional hub for daily activities.

## The Goal: Contextual Landing Hubs

We need to replace the generic "Dashboard" concept with role-specific "Command Centers." When a user logs in, the screen they see should immediately tell them what needs their attention right now.

---

## 1. The Admin "Executive Command Center"

_Target Audience: Owner / General Manager_

This dashboard consolidates the new Reporting modules into a single pane of glass focusing on financials and anomalies.

### Key Components:

- **The Valuation Ticker:** Real-time total inventory value (summing raw + bulk + finished goods).
- **The "Bleed" Alert (Wastage Integration):** A prominent widget pulling from the new Wastage Analysis API. If a batch yesterday had a 15% loss against a 2% expected recipe, it shows up here in red.
- **Critical Re-order Alerts:** A list of `RAW` and `PACKING_MATERIAL` items that have dipped below their `minimum_stock` threshold, requiring immediate purchasing action.
- **Recent Activity Stream:** A chronological list of high-value system events (e.g., "GRN-001 created by User A ($5,000 value)", "User B adjusted stock of Turmeric (-5kg)").

---

## 2. The Operator "Factory Floor Hub"

_Target Audience: Store Keeper / Production Manager_

This dashboard is highly operational, designed for a tablet, and focuses on getting things done quickly.

### Key Components:

- **Quick Actions Row (Massive Buttons):**
    - [ RECEIVE GOODS (GRN) ]
    - [ START PRODUCTION RUN ]
    - [ START PACKING RUN ]
    - [ DISPATCH ORDER ]
- **Pending Tasks / Drafts:** If the operator was in the middle of a complex GRN and the tablet refreshed (utilizing the `useAutoSave` local storage mentioned in architecture), a card says: "Resume draft GRN for Supplier XYZ."
- **Stock Out Blockers:** A warning area showing if any active `Recipes` are currently impossible to execute because a required raw material is out of stock.

## Technical Implementation Path

1.  **Component Refactoring (`frontend/src/pages/dashboards/`):**
    - Remove the monolithic `renderDashboard` logic from `App.tsx`.
    - Create dedicated components: `AdminDashboard.tsx` and `OperatorDashboard.tsx`.
2.  **API Data Fetching (React Query):**
    - Create a set of backend 'Dashboard Aggregator' endpoints (e.g., `GetAdminDashboardStats`, `GetOperatorDashboardAlerts`) so the frontend only makes one network call to populate the initial view.
3.  **Routing Updates (`rbac.ts` & Navigation):**
    - Ensure the default `/` route redirects intelligently based on the user's role claim in their JWT token.
