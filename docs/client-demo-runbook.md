# Client Demo Runbook - Motaba Masala

## Objective
Show a fully working, end-to-end core business workflow in an isolated demo module, so client feedback can be captured before development starts.

## Isolation Guarantee (say this first)
- This demo is fully isolated from production runtime and data.
- It uses browser localStorage only (`motaba_demo_v1`).
- No DB, no backend API calls, no file operations to production project paths.

## Launch
1. Open terminal in project root.
2. Run:

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

3. Open: `http://127.0.0.1:5173/`

## Live Demo Script (8-12 min)
1. **Open Demo Console**
- Show top banner that confirms demo isolation.
- Click `Load Example Scenario`.
- Call out visible starting stock and reorder alerts.

2. **Procurement / GRN**
- Create one GRN for Raw or Packing item.
- Explain: supplier, lot, qty, and cost captured.
- Show stock snapshot increases and ledger line creation.

3. **In-House Production (Raw -> Bulk)**
- Enter actual consumption quantities (not auto-filled), then output + wastage.
- Submit and show:
  - raw stock decreases,
  - bulk in-house stock increases,
  - ledger records production event.

4. **Packing (Bulk -> Finished Goods)**
- Select source bulk type and source batch.
- Enter good and damaged units.
- Submit and show:
  - bulk stock decreases,
  - pouch stock decreases,
  - finished goods stock increases.

5. **Dispatch (FIFO)**
- Create a dispatch for customer (e.g., 120 pcs).
- Show dispatch record listing FIFO batch allocations.
- Highlight this as true operational behavior.

6. **Sales Return**
- Process one `GOOD` return and one `DAMAGED` return.
- Show behavior split:
  - good return adds stock back,
  - damaged return is written off.

7. **Instruction Guide Page**
- Switch to `Instruction Guide` tab.
- Show that full flow and example are documented for users.

8. **Reset for Re-run**
- Click `Reset Demo` to show repeatability and safe experimentation.

## Questions to Ask Client During Demo
- Is this the exact operational sequence on your floor?
- Any missing validations before saving each step?
- Any additional fields needed in GRN/production/dispatch?
- Where should approvals/checkpoints be added in real implementation?
- Any mismatch in third-party bulk backup flow?

## What Is Deliberately Out of Scope in Demo
- Multi-user behavior
- Licensing/activation
- Server/client LAN networking
- Accounting/GST integration

## Post-Demo Capture Template
Use this structure right after meeting:
- Confirmed workflow steps:
- Required changes in sequence:
- Required additional fields:
- New validation rules:
- Reports expected at MVP:
- Items explicitly deferred:

