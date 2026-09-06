# Defect Report: BUG-10 (SEC-02 / DESK-01)

**Bug ID:** BUG-10  
**Legacy Reference:** SEC-02 / DESK-01 / TC-D10.006  
**Component:** Electron Desktop Shell (`SourceCode/Angular/main.js`)  
**Module:** Electron Window Management & Shell Security  
**Severity:** **HIGH**  
**Reproducible:** 100% Deterministic  
**Security Classification:** Electron Security Best Practice Violation (CWE-668 / CWE-489)

---

## 1. Description & Security Impact

1. **Disabled Context Isolation & Enabled Node Integration in Main Window:**
   In `SourceCode/Angular/main.js:489-491`, the primary application window `createMainWindow()` configures:
   ```javascript
   webPreferences: {
     nodeIntegration: true,
     contextIsolation: false
   }
   ```
   This is a severe Electron vulnerability. With `nodeIntegration: true` and `contextIsolation: false`, any client-side JavaScript running in the Angular application (or third-party libraries loaded by it) has direct, unrestricted access to the Node.js runtime and native OS APIs (`require('child_process')`, `require('fs')`, `process`). If an XSS vulnerability exists anywhere in the frontend or in imported data (e.g. customer name, product description), an attacker can execute arbitrary system shell commands with local user privileges.
2. **Unconditional Detached DevTools in Secure Login:**
   In `SourceCode/Angular/main.js:559`, the `showCloudLogin()` function unconditionally calls:
   ```javascript
   win.webContents.openDevTools({ mode: 'detach' });
   ```
   This forces Chromium Developer Tools to open in a separate detached window whenever the user performs Cloud Login, even in packaged production builds.

---

## 2. Root Cause Analysis

Electron security guidelines strictly mandate:
- `contextIsolation: true`
- `nodeIntegration: false`
- Restricting OS and IPC interactions to a controlled `preload.js` script using `contextBridge.exposeInMainWorld()`.

In `main.js`, `showCloudLogin` correctly specifies `nodeIntegration: false, contextIsolation: true, preload: ...`, but `createMainWindow` was left with legacy insecure flags (`nodeIntegration: true, contextIsolation: false`).

---

## 3. Remediation Plan

1. In `createMainWindow()`, configure `preload.js`:
   ```javascript
   webPreferences: {
     nodeIntegration: false,
     contextIsolation: true,
     preload: path.join(__dirname, 'preload.js')
   }
   ```
2. In `showCloudLogin()`, remove unconditional `openDevTools({ mode: 'detach' })` and only open DevTools if `process.argv.includes('--dev')`.
