# Motaba Masala - Interactive Demo

> **A fully working, end-to-end demo** of the Motaba Masala Inventory & Production Management System.
> All data is stored in localStorage — no database, no backend, no external dependencies.

## 🚀 Quick Start

```bash
cd demo
npm install
npm run dev
```

The demo will open at **http://localhost:5180**

## 📋 What's Included

| Stage | Description |
|-------|-------------|
| **Instructions** | Visual flow diagram, walkthrough example, key concepts |
| **Master Data** | Items, Recipes/BOM, Suppliers, Customers (pre-loaded) |
| **Procurement** | GRN creation with lot tracking, weighted avg cost |
| **Production** | Batch creation, recipe execution, yield/wastage tracking |
| **Packing** | Bulk → Retail pack conversion with cost rollup |
| **Dispatch** | Sales orders, FIFO, margin calculation |
| **Reporting** | Stock ledger, valuation, yield analysis, audit trail |

## 🔄 Reset

Click the "Reset Demo" button in the header to clear all data and reload seed data.

## ⚠️ Isolation

This demo is **completely isolated** from the production codebase. It has:
- Its own `package.json` and dependencies
- Zero imports from the main `frontend/` or `internal/` code
- localStorage-only data (no SQLite, no Go backend)
