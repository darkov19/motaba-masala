# 🌶️ Motaba Masala Demo Quickstart

This is a **100% functional**, isolated demo of the Motaba Masala Inventory Management System. It uses `localStorage` for data persistence and does not require a backend or database to run.

## 🚀 How to Start the Demo

1. **Open your terminal** in the project root.
2. **Run the following commands:**

```bash
cd demo
npm install
npm run dev
```

3. **Open your browser** to:
   👉 **[http://localhost:5180](http://localhost:5180)**

---

## 📖 What to do in the Demo?
The demo includes an **Instruction Page** as the landing screen. It provides a complete walkthrough scenario including:
- **Master Data:** Pre-loaded spices and recipes.
- **Procurement:** Receiving stock with Lot Tracking.
- **Production:** Grinding raw materials into bulk powder.
- **Packing:** Converting bulk into retail pouches.
- **Dispatch:** Shipping to customers via FIFO.
- **Reporting:** Real-time inventory valuation and wastage tracking.

## 🔄 Resetting the Demo
If you want to start fresh, just click the **"Reset Demo"** button in the header of the application. This will clear the `localStorage` and reload the initial seed data.

## 🛠️ Tech Stack
- **Framework:** React + Vite + TypeScript
- **Styling:** Vanilla CSS (Custom Design System)
- **Data:** `localStorage` (No backend needed)
