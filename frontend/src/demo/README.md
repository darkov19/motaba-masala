# 🌶️ Masala Inventory — Interactive Demo

This directory contains the isolated interactive demo for the Masala Inventory Management System. It allows stakeholders to experience the full "Happy Path" business workflow without needing a backend or database.

## 🚀 How to Start the Demo

1.  **Open your terminal** and navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2.  **Start the development server**:
    ```bash
    npm run dev
    ```

3.  **Open the Demo URL** in your browser:
    # 👉 [http://localhost:5173/#/demo](http://localhost:5173/#/demo)

    *(Note: If port 5173 is in use, check your terminal for the correct port, e.g., 5174)*

---

## 🎮 Demo Walkthrough Steps

The demo guides you through the complete manufacturing lifecycle:

1.  **Welcome**: Overview of the system capabilities.
2.  **Master Data**: View Items, Suppliers, Customers. **Create new Custom Recipes** here!
3.  **GRN (Goods Received)**: Receive Raw Materials (e.g., Coriander, Cumin) from suppliers to build stock.
4.  **Production**: Execute a batch using a Standard or Custom Recipe. Converts Raw Materials → Bulk Powder.
5.  **Third-Party Bulk**: (Optional) Simulate buying bulk powder directly from an external source. You can **Skip** this step.
6.  **Packing**: Convert Bulk Powder + Packing Materials (Pouches/Boxes) → Finished Goods.
7.  **Dispatch**: Sell and dispatch Finished Goods to customers.
8.  **Reports**: View the full traceability chain, stock ledger, and transaction history.

## ℹ️ Important Notes

-   **In-Memory State**: All data is stored in your browser's memory. **Refresing the page will reset the data.**
-   **Reset Button**: Use the "Reset Demo" button in the top-right corner to clear all data and start fresh without refreshing.
-   **Isolation**: This demo runs entirely on the client-side (`frontend/src/demo`) and does not interact with any backend APIs.
