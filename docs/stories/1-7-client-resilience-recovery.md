# Story 1.7: Client Resilience & Recovery

Status: ready-for-dev

## Story

As a Factory Data Operator,
I want my work to be saved automatically and connection glitches handled gracefully,
so that I don't lose data when the network drops or my PC restarts.

## Acceptance Criteria

1.  **Auto-Draft**: Every 5 seconds, form data is saved to `localStorage` (keyed by User + Context). On next load, if a draft exists, the user is prompted: "You have an unsaved GRN from 2 minutes ago. Resume?". [Source: docs/resilience-audit-report.md#2.1]
2.  **Connection Status Indicator**: A visual indicator (🟢/🔴) in the header shows real-time server connection status. [Source: docs/resilience-audit-report.md#3.1]
3.  **Reconnection Overlay**: When the connection drops, a full-screen overlay appears: "Attempting to reconnect..." with a "Retry" button. It auto-retries every 3 seconds. The overlay disappears automatically on successful reconnection.
4.  **Unsaved Changes Warning**: If the user tries to navigate away (browser back, menu click) or close the window while a form has dirty/unsaved data, a modal warning appears: "You have unsaved changes. Leave anyway?". [Source: docs/resilience-audit-report.md#2.2]

## Tasks / Subtasks

- [ ] Task 1: Implement Connection Monitoring (AC: 2, 3)
    - [ ] Create `ConnectionContext` in React.
    - [ ] Implement wails runtime Event listener (or polling) to detect backend connectivity.
    - [ ] Create `ConnectionStatus` component (Header indicator).
    - [ ] Create `ReconnectionOverlay` component (Full screen modal).

- [ ] Task 2: Implement Auto-Draft Hook (AC: 1)
    - [ ] Create custom hook `useAutoSave(key: string, data: any)`.
    - [ ] Implement `localStorage` logic with throttling (save every 5s).
    - [ ] Implement recovery logic: On mount, check `localStorage`. If exists, show `Modal.confirm` to resume.
    - [ ] Integrate hook into `GRNForm` and `BatchForm`.

- [ ] Task 3: Implement Unsaved Changes Guard (AC: 4)
    - [ ] Create `useUnsavedChanges(isDirty: boolean)` hook.
    - [ ] Use `react-router-dom` `useBlocker` (if using data router) or `Prompt` logic.
    - [ ] Handle Wails window close event override to check dirty state before allowing close (requires IPC to backend to cancel close).

- [ ] Task 4: Verification (AC: 1, 2, 3, 4)
    - [ ] Manual Test: Disconnect network, verify overlay.
    - [ ] Manual Test: Close browser/reload, verify draft prompt.
    - [ ] Manual Test: Navigate away with dirty form, verify warning.

## Dev Notes

- **Architecture**: Frontend-heavy story. Most logic resides in React `src/` components.
- **State Management**: Use React Context for global connection state.
- **Performance**: `localStorage` is synchronous. Ensure data payload isn't massive. For purely text forms, it's fine.
- **Wails Integration**: `runtime.EventsOn` for backend connection events if available, or just standard `fetch` failure detection. Wails also has `EventsEmit` we can use from Go to signal heartbeat.
- **Project Structure Notes**:
    - New Hook: `src/hooks/useAutoSave.ts`
    - New Component: `src/components/layout/ConnectionOverlay.tsx`

## Learnings from Previous Story

**From Story 1.4 (Local Authentication & RBAC)**

- **Global State Management**: Use the React Context pattern established in `AuthContext` for the new `ConnectionContext`.
- **Interceptor Pattern**: The `AxiosInterceptor` used for JWT injection can be extended (or mirrored) to detect network failures and trigger the Reconnection Overlay.

**From Story 1.3 (Hardware Licensing)**

- **Wails Events**: Reuse the pattern of listening to backend events (used in license validation) for connection heartbeats.

## Dev Agent Record

### Context Reference

- [Story Context](./1-7-client-resilience-recovery.context.xml)

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-02-15: Story drafted.

---

## Senior Developer Review (AI)

### Reviewer

### Date

### Outcome

### Summary

### Key Findings

#### HIGH Severity

#### MEDIUM Severity

#### LOW Severity

### Acceptance Criteria Coverage

### Task Completion Validation

### Test Coverage and Gaps

### Architectural Alignment

### Security Notes

### Best-Practices and References

### Action Items
