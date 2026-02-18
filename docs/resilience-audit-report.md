# Resilience Audit Report — Masala Inventory Management

**Date:** 2026-02-14
**Author:** darko (assisted by AI)
**Scope:** All failure, crash, and edge-case scenarios for the distributed Wails application (Server + Clients over LAN).

---

## Executive Summary

This report identifies **18 failure scenarios** across 6 categories. For each scenario, we document:

- **What happens** (the symptom)
- **Impact** (who is affected and how badly)
- **Recommended mitigation** (what we build to handle it)

---

## Category 1: Server Application Failures

### 1.1 ❌ Admin Clicks the "X" Button on Server Window

|                  |                                                                                                                                                                                                                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What Happens** | The Wails window closes and the entire Go process terminates. The SQLite DB, UDP broadcaster, and JSON-RPC listener all stop.                                                                                                                                                          |
| **Impact**       | 🔴 **Critical** — All clients instantly lose connection. Any unsaved form data on clients is lost.                                                                                                                                                                                     |
| **Mitigation**   | **Minimize to System Tray.** Intercept the `WM_CLOSE` event. Instead of quitting, hide the window and place an icon in the Windows System Tray. Right-click menu: "Open Dashboard" / "Exit Server". A confirmation dialog on "Exit Server": _"4 clients are connected. Are you sure?"_ |

### 1.2 ❌ Server PC Crashes / Power Outage (Hard Kill)

|                  |                                                                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What Happens** | The Go process is killed instantly. No graceful shutdown occurs.                                                                                                                                                                                        |
| **Impact**       | 🔴 **Critical** — Clients disconnect. Potential for corrupted SQLite write if a transaction was mid-flight.                                                                                                                                             |
| **Mitigation**   | **SQLite WAL mode** (already planned) ensures crash recovery. On next startup, SQLite automatically replays the WAL journal and recovers to the last committed state. Uncommitted transactions are safely rolled back. No data loss for committed data. |

### 1.3 ❌ Server Runs Out of Disk Space

|                  |                                                                                                                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What Happens** | SQLite `INSERT`/`UPDATE` operations fail with `SQLITE_FULL`. Backups also fail.                                                                                                                                                               |
| **Impact**       | 🟡 **High** — New transactions (GRN, Batches, Dispatches) cannot be saved. Existing data is safe.                                                                                                                                             |
| **Mitigation**   | **Disk Space Monitor.** On startup and every 30 minutes, check available disk space. If < 500MB, show a persistent warning banner in Admin Dashboard: _"⚠️ Low disk space — X MB remaining. Data operations may fail."_ Also log the warning. |

### 1.4 ❌ Server Process Hangs (Deadlock / Infinite Loop)

|                  |                                                                                                                                                                                                                                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What Happens** | The Server window becomes unresponsive. UDP broadcasts may stop. RPC calls time out.                                                                                                                                                                                                                                 |
| **Impact**       | 🔴 **Critical** — Clients see "Connection Timeout" errors. No data can be saved.                                                                                                                                                                                                                                     |
| **Mitigation**   | **Watchdog Timer.** A lightweight goroutine pings the main service loop every 10 seconds. If no response for 30 seconds, auto-restart the service layer (not the whole app). Also: **Client-side timeout handling** — if RPC call takes > 10 seconds, show "Server not responding. Retrying..." with a retry button. |

---

## Category 2: Client Application Failures

### 2.1 ❌ Client Crashes Mid-Form Entry

|                  |                                                                                                                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **What Happens** | User was filling in a GRN or Production Batch form. Browser/Wails process dies.                                                                                                                                                                  |
| **Impact**       | 🟡 **Medium** — Unsaved form data is lost. User must re-enter.                                                                                                                                                                                   |
| **Mitigation**   | **Auto-Draft to LocalStorage.** Every 5 seconds, save form state to the browser's `localStorage`. On next load, detect the draft and offer: _"You have an unsaved GRN from 2 minutes ago. Resume?"_ Clear the draft after successful submission. |

### 2.2 ❌ Client "X" Button Clicked

|                  |                                                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **What Happens** | Client window closes. No impact on server or other clients.                                                                         |
| **Impact**       | 🟢 **Low** — Only affects that one user. Server is unaffected.                                                                      |
| **Mitigation**   | **No special handling needed** for MVP. Optionally, warn if a form has unsaved changes: _"You have unsaved changes. Close anyway?"_ |

### 2.3 ❌ Client PC Reboots / Power Loss

|                  |                                                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What Happens** | Client process dies. Server detects the TCP connection drop and cleans up the session.                                                                           |
| **Impact**       | 🟢 **Low** — Only that user is affected.                                                                                                                         |
| **Mitigation**   | **Auto-Start on Boot** (NSIS installer option) + **Auto-Draft** (2.1 above). When the machine restarts, the app opens automatically and offers to resume drafts. |

---

## Category 3: Network Failures

### 3.1 ❌ LAN Cable Unplugged / WiFi Drops (Client Side)

|                  |                                                                                                                                                                                                                                                                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What Happens** | Client loses TCP connection to server. RPC calls fail immediately.                                                                                                                                                                                                                                                                     |
| **Impact**       | 🟡 **High** — User cannot save any data. Forms are still visible but non-functional.                                                                                                                                                                                                                                                   |
| **Mitigation**   | **Connection Status Indicator** — A small dot (🟢/🔴) in the top-right corner of the client UI. When connection drops: show a full-screen overlay _"⚠️ Connection Lost. Reconnecting..."_ with an auto-retry every 3 seconds. Once reconnected, dismiss overlay and resume. Combine with **Auto-Draft** (2.1) so no form data is lost. |

### 3.2 ❌ Server IP Changes (DHCP Reassignment)

|                  |                                                                                                                                                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What Happens** | Server gets a new IP. Existing client TCP connections break. New UDP broadcasts advertise the new IP.                                                                                                                                                                                 |
| **Impact**       | 🟡 **Medium** — Temporary disconnection (seconds) until clients pick up the new broadcast.                                                                                                                                                                                            |
| **Mitigation**   | **UDP Re-Discovery.** Clients already listen for UDP broadcasts. When a TCP connection fails, the client falls back to UDP listening mode and automatically reconnects to the new IP. **Recommendation:** Assign a **static IP** to the Server PC (documented in installation guide). |

### 3.3 ❌ Network Switch / Router Failure

|                  |                                                                                                                                                                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What Happens** | All network traffic stops. Server keeps running but no clients can connect.                                                                                                                                                                    |
| **Impact**       | 🔴 **Critical** — All clients are offline. Server admin can still use the Server UI directly.                                                                                                                                                  |
| **Mitigation**   | **Server UI remains fully functional** even without network (it accesses DB directly). Clients show reconnection overlay. **No data loss** — server data is safe. Once network hardware is restored, clients auto-reconnect via UDP discovery. |

### 3.4 ❌ Firewall Blocks Server Ports

|                  |                                                                                                                                                                                                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What Happens** | Clients can't discover or connect to the server. UDP broadcasts are silently dropped.                                                                                                                                                                                            |
| **Impact**       | 🔴 **Critical** — No clients can connect at all. Looks like "Server not found."                                                                                                                                                                                                  |
| **Mitigation**   | **Installer adds Firewall Rules** automatically (NSIS script). If detection still fails, client shows: _"Cannot find server. Ensure the server is running and port 8090 is not blocked by firewall."_ **First-run check** on Server: verify port is open, warn admin if blocked. |

---

## Category 4: Data Integrity Issues

### 4.1 ❌ Concurrent Edits (Two Users Edit Same Item)

|                  |                                                                                                                                                                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What Happens** | User A and User B both open "Chili Powder" item. User A saves. User B saves (overwriting A's changes).                                                                                                                                                   |
| **Impact**       | 🟡 **Medium** — Silent data loss (last-write-wins).                                                                                                                                                                                                      |
| **Mitigation**   | **Optimistic Locking.** Add an `updated_at` timestamp to all editable entities. On save, check: _"Has `updated_at` changed since I loaded this record?"_ If yes, reject with: _"This record was modified by another user. Please reload and try again."_ |

### 4.2 ❌ Database File Corruption

|                  |                                                                                                                                                                                                                                                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What Happens** | SQLite file becomes corrupted (bad sector on disk, forced write during power failure without WAL).                                                                                                                                                                                                                               |
| **Impact**       | 🔴 **Critical** — Application cannot read/write data. All operations fail.                                                                                                                                                                                                                                                       |
| **Mitigation**   | **WAL mode** (reduces corruption risk to near zero). **Integrity Check** on startup: run `PRAGMA integrity_check;` — if it fails, show: _"⚠️ Database integrity issue detected. Restore from backup?"_ and offer the admin a list of available backups. **Daily automated backups** ensure a recent restore point always exists. |

### 4.3 ❌ Backup File Also Corrupted

|                  |                                                                                                                                                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What Happens** | Both the live DB and the latest backup are damaged (e.g., same disk failure).                                                                                                                                                                                                         |
| **Impact**       | 🔴 **Catastrophic** — Potential data loss.                                                                                                                                                                                                                                            |
| **Mitigation**   | **Rolling retention** (7 daily + 4 weekly = 11 restore points). **Recommendation in install guide:** Configure backup folder on a **different physical drive** (e.g., DB on `C:\`, backups on `D:\`). Optionally, allow the admin to back up to a USB drive manually via Admin Panel. |

---

## Category 5: Licensing & Security Edge Cases

### 5.1 ❌ License Expires Mid-Day

|                  |                                                                                                                                                                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **What Happens** | Server's background license check detects expiry. API shuts down.                                                                                                                                                                                                                                                              |
| **Impact**       | 🔴 **Critical** — All clients immediately lose access. Active forms are lost.                                                                                                                                                                                                                                                  |
| **Mitigation**   | **Grace Period + Warning.** Starting 30 days before expiry, show a persistent banner: _"⚠️ License expires in X days. Contact support."_ On actual expiry date: allow **read-only mode** for 7 days (users can view data but not create new transactions). After 7 days: full lockout. This prevents mid-production data loss. |

### 5.2 ❌ System Clock Tampered (Set Backwards)

|                  |                                                                                                                                                                                                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What Happens** | Someone sets the Windows clock back to extend the license. Server detects the discrepancy via encrypted heartbeat counter.                                                                                                                                                              |
| **Impact**       | 🔴 **Critical** — Server locks out completely until the clock is corrected.                                                                                                                                                                                                             |
| **Mitigation**   | Already implemented in Epic 1 (heartbeat file). **Enhancement:** Show a clear message: _"System clock inconsistency detected. Please set your system clock to the correct date and time, then restart the application."_ Do NOT auto-unlock — require a restart after clock correction. |

### 5.3 ❌ Server Hardware Changed (Motherboard / Disk Replaced)

|                  |                                                                                                                                                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What Happens** | Hardware fingerprint no longer matches `license.key`. Server refuses to start.                                                                                                                                                                                  |
| **Impact**       | 🔴 **Critical** — Complete lockout. Cannot be resolved by the customer.                                                                                                                                                                                         |
| **Mitigation**   | Show a clear error: _"Hardware change detected. Your license is bound to specific hardware. Please contact support with your new Hardware ID: [XXXX-YYYY]."_ Provide a "Copy Hardware ID" button. Developer generates a new `license.key` for the new hardware. |

---

## Category 6: User Error Scenarios

### 6.1 ❌ Admin Deletes the Database File Manually

|                  |                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What Happens** | On next startup, the app finds no DB file.                                                                                                                                                                                                                                                                                                                                 |
| **Impact**       | 🔴 **Critical** — All data is gone.                                                                                                                                                                                                                                                                                                                                        |
| **Mitigation**   | On startup, if no DB exists: check for backups. If backups found, offer: _"No database found. Restore from latest backup (2 hours ago)?"_ If no backups: create a fresh DB from migrations (clean slate) and show: _"A new empty database has been created."_ **Hide the DB file** in `%AppData%` (not in the install folder) so users are less likely to stumble upon it. |

### 6.2 ❌ Admin Accidentally Runs Two Server Instances

|                  |                                                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What Happens** | Two processes try to bind to the same port. Second instance fails. Two UDP broadcasters confuse clients.                                                                                                      |
| **Impact**       | 🟡 **Medium** — Clients may connect to the wrong instance. Database locking conflicts.                                                                                                                        |
| **Mitigation**   | **Single Instance Lock.** On startup, create a named Mutex (`MasalaServerMutex`). If it already exists, show: _"Server is already running."_ and focus the existing window instead of launching a second one. |

---

## Summary Matrix

| #   | Scenario                  | Severity        | Mitigation Complexity | Epic          |
| :-- | :------------------------ | :-------------- | :-------------------- | :------------ |
| 1.1 | Admin clicks X            | 🔴 Critical     | Low                   | 1 (Infra)     |
| 1.2 | Server crash / power loss | 🔴 Critical     | Zero (WAL)            | 1 (Infra)     |
| 1.3 | Disk space full           | 🟡 High         | Low                   | 1 (Infra)     |
| 1.4 | Server hangs              | 🔴 Critical     | Medium                | 1 (Infra)     |
| 2.1 | Client crash mid-form     | 🟡 Medium       | Low                   | Cross-cutting |
| 2.2 | Client X button           | 🟢 Low          | Zero                  | —             |
| 2.3 | Client PC reboots         | 🟢 Low          | Low                   | Installer     |
| 3.1 | LAN cable unplugged       | 🟡 High         | Low                   | 1 (Infra)     |
| 3.2 | Server IP changes         | 🟡 Medium       | Zero (UDP)            | 1 (Infra)     |
| 3.3 | Network switch failure    | 🔴 Critical     | Zero (inherent)       | —             |
| 3.4 | Firewall blocks ports     | 🔴 Critical     | Low                   | Installer     |
| 4.1 | Concurrent edits          | 🟡 Medium       | Medium                | Cross-cutting |
| 4.2 | DB corruption             | 🔴 Critical     | Low (WAL + check)     | 1 (Infra)     |
| 4.3 | Backup also corrupted     | 🔴 Catastrophic | Low (docs)            | 1 (Infra)     |
| 5.1 | License expires mid-day   | 🔴 Critical     | Medium                | 1 (Infra)     |
| 5.2 | Clock tampered            | 🔴 Critical     | Zero (built)          | 1 (Infra)     |
| 5.3 | Hardware changed          | 🔴 Critical     | Low (UX)              | 1 (Infra)     |
| 6.1 | DB file deleted           | 🔴 Critical     | Low                   | 1 (Infra)     |
| 6.2 | Two server instances      | 🟡 Medium       | Low                   | 1 (Infra)     |

---

## Implementation Status Overview

### 🔨 Needs New Code (Must-Have for MVP)

| #   | Mitigation                                          | Why                                            |
| :-- | :-------------------------------------------------- | :--------------------------------------------- |
| 1.1 | **System Tray**                                     | Prevents the #1 most likely user error         |
| 1.3 | **Disk Space Monitor**                              | Warns admin before writes start failing        |
| 1.4 | **Watchdog Timer**                                  | Auto-recovers from server hangs                |
| 2.1 | **Auto-Draft to LocalStorage**                      | Protects factory workers from losing form data |
| 2.2 | **Unsaved Changes Warning**                         | Standard UX pattern                            |
| 3.1 | **Connection Status Indicator + Reconnect Overlay** | Essential UX for LAN app                       |
| 3.4 | **Firewall Rule in Installer**                      | Prevents "it doesn't work" support calls       |
| 4.1 | **Optimistic Locking**                              | Prevents silent data overwrites                |
| 4.2 | **Integrity Check on Startup**                      | Safety net for DB health                       |
| 5.1 | **License Expiry Warning + Read-Only Grace Period** | Prevents mid-production lockouts               |
| 5.3 | **Hardware Change Error Message**                   | Clear UX so customer can contact support       |
| 6.1 | **Missing DB → Offer Backup Restore**               | Recovers from accidental deletion              |
| 6.2 | **Single Instance Lock**                            | Prevents silent data corruption                |

### ✅ Already Handled by Architecture (Zero Effort)

| #   | Scenario                  | Why It's Covered                                                      |
| :-- | :------------------------ | :-------------------------------------------------------------------- |
| 1.2 | Server crash / power loss | SQLite WAL mode auto-recovers on next startup                         |
| 2.3 | Client PC reboots         | Auto-Start configured via NSIS installer                              |
| 3.2 | Server IP changes         | UDP re-discovery reconnects automatically                             |
| 3.3 | Network switch failure    | Server UI works locally; clients auto-reconnect when network restores |
| 5.2 | Clock tampered            | Already built in Epic 1 (encrypted heartbeat counter)                 |
