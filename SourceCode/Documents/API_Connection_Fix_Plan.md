# Fix API Connection Issue in Electron

The Electron application is experiencing `net::ERR_CONNECTION_REFUSED` when trying to connect to the background API on client machines. This indicates the API is either not running or the connection is being blocked/redirected improperly.

## Technical Analysis

1.  **HTTPS Redirection**: `Startup.cs` currently calls `app.UseHttpsRedirection()` unconditionally. In Desktop mode, Kestrel is only configured for HTTP on port 5000. If the app attempts to redirect to HTTPS (port 5001), it will fail with `CONNECTION_REFUSED` if port 5001 is not listening.
2.  **Hangfire Connection String**: In `Program.cs`, the Hangfire SQLite connection string is overridden in Desktop mode with just a file path, missing the required `Data Source=` prefix. This could cause Hangfire initialization to fail and crash the app.
3.  **Logging**: The current `main.js` doesn't capture and log the API process outputs clearly to the log file, making it hard to debug on client machines.

## Proposed Changes

### API Project

#### [MODIFY] [Program.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Program.cs)
- Fix the Hangfire SQLite connection string when running in Desktop mode:
  ```csharp
  sqliteconnectionString = $"Data Source={dbPath}";
  ```

#### [MODIFY] [Startup.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Startup.cs)
- Conditionally disable `app.UseHttpsRedirection()` when running in Desktop mode.

### Electron Project

#### [MODIFY] [main.js](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/main.js)
- Improve logging of the API process's `stdout` and `stderr` to the `api-debug.log` file.

## Verification Plan

### Manual Verification
1. Rebuild the API.
2. Repackage the Electron app.
3. Install on a client machine and verify login.
4. Check `api-debug.log` for successful startup messages.
