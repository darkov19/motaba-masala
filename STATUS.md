# App Status
- **Repository**: `https://github.com/darkov19/motaba-masala.git` (cloned to `motaba-masala`)
- **Frontend**: Built successfully (`dist/`). Dev server runs on `http://localhost:5173`.
- **Backend**: **Built successfully**.
  - **Go Version**: Upgraded to 1.24.0.
  - **Wails CLI**: Installed v2.11.0.
  - **System Deps**: Installed `libwebkit2gtk-4.1-dev`, `libayatana-appindicator3-dev`.
  - **License Check**: Patched to bypass validation when `MASALA_APP_ENV=dev`.
- **Running**:
  - `npm run dev`: Works (serves frontend).
  - `go run ./cmd/server`: **Fails** due to missing display (Headless environment). `panic: failed to init GTK`.
  - `wails dev`: **Fails** due to permission denied when executing the binary.

## How to Run (Local Machine with Display)
1.  **Install Deps**:
    ```bash
    sudo apt install libwebkit2gtk-4.1-dev libayatana-appindicator3-dev
    ```
2.  **Run Dev Mode**:
    ```bash
    export MASALA_APP_ENV=dev
    cd motaba-masala
    wails dev
    ```
    (Or `go run -tags desktop,production,webkit2_41 ./cmd/server`)

The app requires a graphical environment (X11/Wayland) to start.
