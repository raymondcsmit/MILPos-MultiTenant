# Defect Report: BUG-11 (UX-03 / DESK-02)

**Bug ID:** BUG-11  
**Legacy Reference:** UX-03 / DESK-02  
**Component:** Electron Desktop Shell (`SourceCode/Angular/main.js:315-336`)  
**Module:** First-Run Desktop Initialization & Local Database Setup  
**Severity:** **CRITICAL**  
**Reproducible:** 100% Deterministic  

---

## 1. Description & Impact

When running the desktop application in production or standalone mode (`electron:prod`), the shell is designed to check if the user has an initialized SQLite database in `%AppData%\milpos\POSDb.db`.
If not, and the application includes a shipped/bundled database template (`sourceDbPath`), it is supposed to copy `sourceDbPath` into `userDataPath/POSDb.db`.
However, because of a control-flow bug in `main.js:315-336`, the database copy logic is **completely unreachable**. Instead, the application immediately aborts startup and redirects to `login-cloud.html`, forcing an external cloud connection to `http://208.110.72.211` even when the application is installed offline or packaged with pre-seeded data.

---

## 2. Root Cause Analysis

Look at lines 314-336 in `SourceCode/Angular/main.js`:
```javascript
  // 2. Database setup
  const dbPath = path.join(userDataPath, 'POSDb.db');
  
  // First Run Check: If no DB exists, show Cloud Login
  if (!fs.existsSync(dbPath)) {
      clearTimeout(startupTimeout);
      logToFile('STARTUP: No database found. Triggering Cloud Login Flow.');
      
      // Close splash before showing login to prevent layering issues
      if (splash) {
          splash.close();
          splash = null;
      }
      
      showCloudLogin();
      return; // <--- EXITS HERE!
  }

  // DEAD CODE: Unreachable block below!
  if (!fs.existsSync(dbPath) && fs.existsSync(sourceDbPath)) {
      try {
          fs.copyFileSync(sourceDbPath, dbPath);
          appendLog(`Database copied to: ${dbPath}`);
      } catch (err) {
          appendLog(`ERROR: Failed to copy database: ${err}`);
      }
  }
```

Notice:
1. Line 315 checks `if (!fs.existsSync(dbPath))`. If true, it calls `showCloudLogin()` and **returns on line 326**.
2. Line 329 checks `if (!fs.existsSync(dbPath) && fs.existsSync(sourceDbPath))`. Because line 326 returned when `!fs.existsSync(dbPath)`, line 329 can **never execute**!
3. This completely defeats the purpose of shipping a default SQLite template with the desktop app.

---

## 3. Reproduction Steps

1. In a clean environment where `%AppData%\milpos\POSDb.db` is deleted or does not exist.
2. Build the API and publish with `POSDb.db` present in `SQLAPI/POS.API/bin/Release/net10.0/win-x64/publish/POSDb.db`.
3. Launch the desktop app with `npm run electron:prod`.
4. **Observed Behavior:** Instead of copying `POSDb.db` and booting directly, the app immediately halts and displays the Cloud Login screen (`login-cloud.html`).

---

## 4. Remediation Plan

Reorder the initialization logic in `main.js`:
1. Check if `!fs.existsSync(dbPath) && fs.existsSync(sourceDbPath)`. If so, copy `sourceDbPath` to `dbPath`.
2. Only if `!fs.existsSync(dbPath)` remains true (meaning neither a local DB nor a bundled template exists), trigger `showCloudLogin()`.
