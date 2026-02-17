# Architecture: Masala Inventory Management

## Executive Summary

Masala Inventory Management is a **distributed desktop-first, offline-capable** inventory system designed for the Motaba spice factory. It serves as a "Digital Twin" of the factory floor, tracking the real-time transformation of materials from Raw Spices to Bulk Powder to Finished Goods.

The system is built as a **Distributed Wails (Go)** application suite. The **Server** runs on the admin machine (hosting the DB and API), while **Client** executables run on factory workstations, discovering and connecting to the server via LAN (UDP/TCP). This ensures native performance, strict hardware-bound licensing, and robust offline capability.

## Project Initialization

The project will be initialized as a **Wails v2** application.

```bash
# Initialize Wails project with React/TS template
wails init -n masala_inventory_managment -t react-ts

# Frontend Setup (Ant Design 6.0)
cd frontend
npm install antd@latest @ant-design/icons@latest --save
npm install @tanstack/react-query axios --save
```

## Decision Summary

| Category         | Decision                | Version   | Rationale                                                                         |
| :--------------- | :---------------------- | :-------- | :-------------------------------------------------------------------------------- |
| **Architecture** | **Wails v2**            | 2.11.0    | Native Windows WebView2 (low dependency), Single Binary, Go performance.          |
| **Frontend**     | **React + Vite**        | 19.2.4    | Industry standard, high performance, specifically requested.                      |
| **UI Library**   | **Ant Design**          | **6.2.1** | Enterprise-grade components, pure CSS variables (Zero-Runtime), latest features.  |
| **Backend**      | **Go (Golang)**         | 1.26      | Type-safe, high concurrency, simple deployment, excellent hardware access.        |
| **Database**     | **SQLite**              | 3.51.2    | Zero-config, single-file storage, ACID compliant. Hosted ONLY on Server Node.     |
| **Networking**   | **UDP + JSON-RPC**      | -         | Zero-config server discovery (UDP) + Secure RPC over TCP for Client-Server comms. |
| **Migrations**   | **golang-migrate**      | 4.19.1    | Embedded migration scripts ensure strictly versioned DB schema on Server launch.  |
| **Licensing**    | **MachineID + Ed25519** | -         | Bound to Server Hardware. Clients validate session against Server.                |
| **State Mgmt**   | **React Query**         | 5.90.21   | Best for async server state (Wails bindings behave like async API calls).         |

## Project Structure

We follow a **Hexagonal Architecture** (Ports and Adapters) within the Go backend to keep business logic independent of Wails.

```
masala_inventory_managment/
├── build/                  # Wails build artifacts
├── frontend/               # React Application (The "View" - SHARED between Server/Client)
│   ├── src/
│   │   ├── components/
│   │   ├── wailsjs/        # AUTO-GENERATED: Go bindings
│   │   ├── App.tsx
│   │   └── main.tsx
├── internal/               # Go Internal Packages (The "Core")
│   ├── app/                # Application Layer (Use Cases)
│   ├── domain/             # Domain Layer (Entities & Pure Logic)
│   └── infrastructure/     # Infrastructure Layer (Adapters)
│       ├── db/             # SQLite implementation (Server Only)
│       ├── network/        # Networking (UDP Discovery, RPC Server/Client)
│       └── license/        # Hardware binding logic
├── cmd/
│   ├── server/             # MAIN Server Application Entry point
│   │   └── main.go
│   └── client/             # MAIN Client Application Entry point
│       └── main.go
├── wails_server.json       # Config for Server build
├── wails_client.json       # Config for Client build
└── go.mod
```

## Epic to Architecture Mapping

| Epic                   | Architecture Component                                                                                                      |
| :--------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| **1. Core Foundation** | `internal/infrastructure/db` (SQLite), `internal/infrastructure/license` (HW Binding), `frontend/src/wailsjs` (Auth Bridge) |
| **2. Master Data**     | `internal/domain/models` (Item, Recipe), `internal/app/commands` (CreateItem)                                               |
| **3. Procurement**     | `internal/app/commands` (CreateGRN), `internal/domain/services` (StockUpdator)                                              |
| **4. Production**      | **Core Logic:** `internal/domain/services` (YieldCalculator, CostAverager). This is the "Brain".                            |
| **5. Packing**         | `internal/app/commands` (ExecutePacking), `internal/domain/services` (UnitConverter)                                        |
| **6. Sales/Dispatch**  | `internal/app/commands` (CreateDispatch), PDF Generator Adapter (Go libraries)                                              |
| **7. Reporting**       | `internal/app/queries` (Complex SQL Aggregations for Valuation/Wastage)                                                     |

## Implementation Patterns

### 1. IPC Pattern: Wails Bindings (Service Method)

We utilize **Two Modes of Binding** depending on the executable:

- **Server.exe**: Wails Bindings call Go Services -> Repository directly (In-Memory).
- **Client.exe**: Wails Bindings call Go "Proxy Services" -> Network RPC -> Server IP -> Server Service.

This allows the Frontend code (React) to remain **identical**. It just calls `wails.InventoryService.CreateGRN()`. The Go implementation changes based on the binary.

### 2. Database Pattern: Repository & embedded Migrations

- **Repository:** We define interfaces for data access (e.g., `ItemRepository`) to allow testing.
- **Migrations:** SQL migration files (`.sql`) are **embedded** into the Go binary using `embed`. On startup, the app checks the user's local SQLite DB version and applies pending migrations automatically.

### 3. Ant Design 6.0 Theme Pattern

We use the new **ConfigProvider** with `token` based theming. **NO LESS VARIABLES.**

```tsx
// frontend/src/App.tsx
import { ConfigProvider } from "antd";

const theme = {
    token: {
        colorPrimary: "#7D1111", // Motaba Deep Maroon
        borderRadius: 6,
        fontFamily: "Inter, sans-serif",
    },
};

export default function App() {
    return (
        <ConfigProvider theme={theme}>
            <RouterProvider router={router} />
        </ConfigProvider>
    );
}
```

### 4. Zero-Config Networking Pattern (UDP + RPC)

- **Discovery:** On startup, `Client.exe` listens on a UDP Multicast address. `Server.exe` broadcasts "I_AM_SERVER_AT_IP_X" every 2 seconds. Client detects this and establishes connection.
- **Protocol:** We use a lightweight JSON-RPC over TCP.
- **Security:**
    - **Authentication:** Standard "Login" (Username/Password) is sent to Server. Server returns a Session Token.
    - **Authorization:** Session Token is required for all subsequent RPC calls. RBAC enforces Admin / Data Entry Operator permissions.

### 5. Hardware Licensing Pattern

- **Server-Side Only:** Only `Server.exe` checks `BIOS UUID` + `Disk Serial`.
- **Enforcement:** If Server license fails/expires, the RPC API shuts down. Clients automatically disconnect and show "Server License Expired".

## Data Architecture

### Core Models

- `Item`: Base entity (ID, Name, Type [RAW/BULK/FG], BaseUnit, AvgCost).
- `Batch`: Traceability unit (ID, ItemID, Qty, Cost, SourceBatchID [Parent]).
- `StockLedger`: Immutable transaction log (Date, Type [GRN/PROD/SALE], QtyChange, ValueChange).

### Deployment Strategy (Thick Client)

- **Build Target:** Windows (`wails build`).
- **Output:**
    - `MasalaServer.exe`: The Brain (DB + Logic).
    - `MasalaClient.exe`: The Terminal (UI + Network Proxy).
    - `license.key`: Placed only on Server.
- **Installer:** NSIS Script generating two installers: "Server Setup" and "Client Setup".

### 6. Resilience & Stability Patterns

- **Server Stability Patterns:**
    - **System Tray:** Intercept `WM_CLOSE` to minimize instead of quit.
    - **Watchdog Goroutine:** Monitors main service loop health; restarts services if unresponsive > 30s.
    - **Disk Space Monitor:** Periodic checks of available disk space; warns admin below 500MB threshold.
    - **Single Instance Mutex:** Windows Named Mutex (`MasalaServerMutex`) prevents multiple server instances.

- **Client Resilience Patterns:**
    - **Auto-Draft Hook:** React custom hook `useAutoSave` writes form state to LocalStorage keyed by user+form ID.
    - **Connection Heartbeat:** Ping server every 2s. If failed, switch UI to "Reconnecting" overlay mode.
    - **Navigation Guard:** React Router `useBlocker` intercepts navigation/close if form is dirty.

- **Data Integrity Patterns:**
    - **Optimistic Locking:** All critical tables have `updated_at`. Updates include `WHERE id=? AND updated_at=?`.
    - **Startup Integrity Check:** Run `PRAGMA integrity_check` before opening DB connections.
