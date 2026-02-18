# Demo Runbook - Client Sandbox

## Purpose
This runbook explains how to run and present the isolated demo sandbox that covers the end-to-end business workflow without touching production DB/files.

## Isolation Guarantees
- Demo runtime entrypoint: `cmd/demo/main.go`
- Demo config: `wails_demo.json`
- Demo UI state uses browser `localStorage` (keyed demo sandbox store)
- Demo backend services are not required for workflow state persistence
- No use of production DB, migrations, licensing, or backup services
- No writes to `masala_inventory.db` or `backups/`

## Demo Startup
1. Install frontend dependencies:
```bash
cd frontend
npm install
```
2. Run demo with Wails demo config:
```bash
wails dev -config wails_demo.json
```
3. Confirm UI loads with title `Masala Demo Sandbox`.

## Presentation Flow (Guided)
1. Open `Guided Demo`.
2. Run steps in order:
- `step-1` Master setup
- `step-2` Raw + packing GRN
- `step-3` Third-party bulk GRN
- `step-4` In-house production
- `step-5` Packing run
- `step-6` Dispatch (FIFO)
- `step-7` Reports review
3. Move to free-play pages (`Procurement`, `Production`, `Packing`, `Dispatch`) to test variations.

## Persona Views
- `Admin`: sees valuation KPI cards.
- `Operator`: operational view; valuation cards hidden.

## Reset Behavior
- `Reset Demo` reloads deterministic seed (`standard`) into `localStorage`.
- Demo state persists between app restarts until reset.

## Demo Acceptance Checklist
- Guided flow completes without dead-end states.
- Alerts update when stock drops below min levels.
- FG dispatch rejects non-FG items.
- FIFO override requires explicit option and shows warning.
- Traceability graph links FG batch back to source bulk batch.

## Troubleshooting
- If data looks stale, click `Reset Demo` to rebuild the local sandbox state.
- If `tsc` command is missing, run `npm install` in `frontend`.
