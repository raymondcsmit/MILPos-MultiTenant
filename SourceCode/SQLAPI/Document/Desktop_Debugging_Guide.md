# Desktop Debugging Guide (Electron.NET)

This guide explains how to debug the desktop version of the MIL POS application.

## 1. Debugging the Frontend (Electron/Angular)

The desktop application is built with Electron and Angular. To debug the frontend:

### Running in Development Mode
1.  Open a terminal in the `Angular` folder: `f:\MIllyass\pos-with-inventory-management\SourceCode\Angular`.
2.  Start the Angular dev server:
    ```bash
    npm start
    ```
3.  In a second terminal (also in the `Angular` folder), start Electron in dev mode:
    ```bash
    npm run electron
    ```

### DevTools
- When running with `npm run electron`, the app is started with the `--dev` flag.
- This automatically opens **Chromium DevTools** and loads the app from `http://localhost:4200`.
- You can also manually open DevTools using `Ctrl + Shift + I`.

---

## 2. Debugging the Backend (API)

In the desktop version, the API runs as a background process spawned by Electron.

### Log Locations
If the API fails to start or encounters errors, check the debug logs:
- **API Debug Log**: `%AppData%\milpos\api-debug.log`
- This log contains the `stdout` and `stderr` output from the .NET process.

### Configuration
- The API uses `appsettings.Desktop.json` when running in the desktop environment.
- Connection strings and tenant info are passed via environment variables during the spawn process in `main.js`.

---

## 3. Common Troubleshooting

### Connection Refused (Port 5000)
- Ensure no other process is using port 5000.
- Check `api-debug.log` to see if the API failed to bind to the port.

### API Not Found
- If you see an error about the API executable not found, run the build command first:
  ```bash
  npm run build:api
  ```
  This creates the executable at `SQLAPI/POS.API/bin/Release/net10.0/win-x64/publish/POS.API.exe`.

### Access Denied / Unable to Copy File (MSB3021)
This error occurs when the `POS.API.exe` is still running in the background and locking the DLL/PDB files.
- **Solution**: Kill all running instances of the API and Electron before building.
- **PowerShell Command**:
  ```powershell
  Stop-Process -Name "POS.API" -ErrorAction SilentlyContinue
  Stop-Process -Name "electron" -ErrorAction SilentlyContinue
  ```

---

## 4. Key Files for Reference
- **Entry Point**: [main.js](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/main.js)
- **IPC Handlers**: [main.js](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/main.js#L103)
- **API Spawning Logic**: [main.js](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/main.js#L259)
