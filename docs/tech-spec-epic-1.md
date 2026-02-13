# Epic Technical Specification: Core Foundation & Infrastructure

Date: 2026-02-12
Author: darko
Epic ID: 1
Status: Contexted

---

## Overview

Epic 1 establishes the core technical foundation of the Masala Inventory Management system. It focuses on setting up the offline-first runtime environment using Wails (Go + React), implementing a robust local database with SQLite, and enforcing critical business constraints through a hardware-bound licensing system and Role-Based Access Control (RBAC). This epic is the prerequisite for all functional modules, ensuring data integrity, security, and portability on the factory floor.

## Objectives and Scope

### Objectives

- Initialize the Wails project repository with a dual-binary architecture (Server/Client).
- Implement a robust SQLite database schema and migration system.
- Secure the application with hardware fingerprinting and asymmetric license validation.
- Establish a local RBAC system to control feature access (e.g., hiding stock valuation from workers).
- Provide an automated local backup mechanism to protect against data loss.

### In-Scope

- Repository setup and tech stack initialization (Vite, React, Ant Design, Go).
- Database schema design for core entities (Users, Roles, Items, Stock Ledger).
- Hardware ID extraction (BIOS/Disk) and Ed25519-signed license validation.
- User management and role-based middleware for IPC (JSON-RPC) calls.
- Automated daily zipping of the SQLite database to a secondary local path.

### Out-of-Scope

- Implementation of functional modules (Procurement, Production, Packing, Sales).
- Integration with external ERP systems (Tally, etc.).
- Native mobile application development (Desktop/LAN only).
- Cloud-based backups or remote administration.

## System Architecture Alignment

This epic aligns directly with the "Distributed Thick Client" architecture. The **Server** node will host the single-source-of-truth SQLite database and enforce the hardware license. The **Client** nodes will connect via LAN using UDP discovery and JSON-RPC. Wails v2 will be used to wrap the React frontend and Go backend into single-file executables. Migration scripts will be embedded in the binary to ensure schema consistency across deployments.

## Detailed Design

### Services and Modules

| Module                 | Responsibility                                                 | Inputs                                 | Outputs          |
| :--------------------- | :------------------------------------------------------------- | :------------------------------------- | :--------------- |
| **App Initialization** | Orchestrates startup, DB checks, and Wails binding.            | Config files                           | Loaded App State |
| **Database Manager**   | Manages SQLite connection and migrations via `golang-migrate`. | Migration scripts, DB file             | DB Handle        |
| **Licensing Service**  | Extracts HW ID and validates against `license.key`.            | BIOS UUID, Disk Serial, Ed25519 PubKey | License Status   |
| **Auth Service**       | Handles user authentication and RBAC session management.       | User credentials                       | JWT/Token, Role  |
| **Backup Service**     | Scheduled background task to zip and rotate DB files.          | DB File, Backup Path                   | `.zip` archive   |
| **IPC Bridge**         | JSON-RPC server/proxy for Client-Server communication.         | RPC Requests                           | Signed Responses |

### Data Models and Contracts

#### Users & Roles

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL, -- Admin, Store, Factory
    permissions TEXT NOT NULL  -- JSON or bitmask
);
```

#### Inventory Foundation

```sql
CREATE TABLE items (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- RAW, BULK, FG, PACK
    base_unit TEXT NOT NULL,
    avg_cost DECIMAL(18, 4) DEFAULT 0,
    min_stock_level DECIMAL(18, 4) DEFAULT 0
);
```

### APIs and Interfaces

| Method | Path/Signature                   | Role Required | Description                                  |
| :----- | :------------------------------- | :------------ | :------------------------------------------- |
| `POST` | `auth.Login(username, password)` | Public        | Authenticates user and returns session.      |
| `GET`  | `admin.GetSystemStatus()`        | Admin         | Returns License status and Backup status.    |
| `POST` | `admin.CreateUser(dto)`          | Admin         | Creates a new system user with roles.        |
| `POST` | `license.Activate(key)`          | Admin         | Validates and saves the license key to disk. |

### Workflows and Sequencing

#### 1. Application Startup (Server)

1.  **Check Hardware ID**: Verify app is running on legitimate hardware.
2.  **Initialize Database**: Check schema version, run migrations if needed.
3.  **Validate License**: Check for time-tampering and Ed25519 signature.
4.  **Start Services**: Start UDP Discovery broadcaster and JSON-RPC listener.

#### 2. Client Connection

1.  **Discovery**: Client listens for UDP broadcast to find Server IP.
2.  **Handshake**: Client establishes TCP connection to Server.
3.  **Authentication**: User logs in; Server provides a role-scoped token.

## Non-Functional Requirements

### Performance

- **Dashboard Load**: < 2 seconds.
- **Search Latency**: < 500ms for item/user lookup.
- **DB Concurrency**: SQLite in WAL mode to support simultaneous reads/writes from multiple LAN clients.

## Post-Review Follow-ups

- Note: Ensure CI/CD pipeline builds with `-ldflags "-X main.LicensePublicKey=$PROD_KEY"` for release builds. (Ref: Story 1.3)

### Security

- **Auth**: Passwords hashed with `bcrypt`. Ed25519-signed session tokens for IPC.
- **Data-at-Rest**: Database file encrypted using `SQLCipher` if higher security is requested (MVP: standard SQLite with limited folder permissions).
- **Network**: JSON-RPC over TCP with optional TLS (LAN-only).

### Reliability/Availability

- **Offline-First**: 100% functionality with zero internet.
- **Auto-Backup**: Daily zipping to `{ProjectRoot}/backups` with rolling 7-day retention.
- **Clock Protection**: Encrypted "Heartbeat" timestamp on disk to detect system clock manipulation.

### Observability

- **Logs**: Structured JSON logging to `logs/server.log` and `logs/client.log`.
- **Status Dashboard**: Admin view showing real-time License and Backup health.

## Dependencies and Integrations

| Dependency         | Purpose                     | Version   |
| :----------------- | :-------------------------- | :-------- |
| **Wails v2**       | Desktop Application Wrapper | `^2.11.0` |
| **Go**             | Backend Runtime             | `1.26`    |
| **React**          | Frontend Framework          | `^19.0.0` |
| **Ant Design**     | UI Component Library        | `^6.2.1`  |
| **SQLite**         | Local Database              | `^3.51.2` |
| **golang-migrate** | Schema Migration            | `^4.19.1` |
| **archiver**       | Backup Zipping              | `^3.5.0`  |

## Acceptance Criteria (Authoritative)

1.  **Project Init**: Application initializes successfully as a Wails project with correct frontend (React+AntD) and backend (Go) structure.
2.  **DB Migrations**: App runs embedded SQL migrations on startup to create `users`, `roles`, `items`, and `stock_ledger` tables.
3.  **HW Licensing**: App extracts BIOS UUID and Disk Serial; blocks startup if a valid, machine-specific `license.key` is missing or tampered.
4.  **RBAC Enforcement**: Admin users can create roles; "Factory" roles are restricted from accessing Stock Valuation reports via IPC middleware.
5.  **Auto-Backup**: A zipped database backup is created on the configured daily schedule with older files automatically pruned.

## Traceability Mapping

| AC ID | Spec Section    | Component          | Test Idea                                                        |
| :---- | :-------------- | :----------------- | :--------------------------------------------------------------- |
| AC1   | 2.1 Services    | App Initialization | Verify `wails init` structure and binary build.                  |
| AC2   | 2.2 Data Models | Database Manager   | Manually drop a column and restart app to trigger migration.     |
| AC3   | 2.1 Services    | Licensing Service  | Swap `license.key` from another machine and verify lockout.      |
| AC4   | 2.3 APIs        | Auth Service       | Attempt to call `Report.GetValuation()` from a 'Worker' session. |
| AC5   | 2.1 Services    | Backup Service     | Force backup trigger and verify `.zip` content in backup dir.    |

## Risks, Assumptions, Open Questions

- **Risk (High)**: OS-level updates changing BIOS UUID reporting → _Mitigation_: Use multiple fingerprints (Disk + Motherboard).
- **Assumption**: Clients are on a trusted local network (LAN) with stable connectivity to the Server.
- **Open Question**: Should we enforce license validation on every API call or only on session start? (Decision: Session start + periodic background heartbeat).

## Test Strategy Summary

1.  **Unit Testing**: Go unit tests for `LicensingService` (mocking HW IDs) and `AuthService` (password hashing).
2.  **Integration Testing**: Verify SQLite schema migrations apply correctly on fresh and existing DB files.
3.  **Security Audit**: Test IPC middleware for Role leakage (attempting unauthorized RPC calls).
4.  **Resilience Test**: Simulate power failure during DB write/backup to ensure WAL recovery works.
