# Walkthrough - API Startup Fixes on Desktop

I have resolved the issue where the background API process was crashing or failing to start on client machines.

## Changes Made

### API Project

#### [Program.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Program.cs)
- Corrected the Hangfire SQLite connection string format. It now correctly uses the file path without the `Data Source=` prefix, which was cause an initialization crash.

#### [Startup.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Startup.cs)
- Moved the storage of static files and logs from `CommonApplicationData` (`C:\ProgramData`) to `ApplicationData` (`%APPDATA%`).
- **Reason**: Standard Windows users often lack permissions to write to `C:\ProgramData`.

### Electron Project

#### [main.js](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/main.js)
- Added `shell: true` to the `spawn` command to improve Windows compatibility.
- Wrapped the API connection string in double quotes to handle spaces in folder paths.
- Updated the exit logger to capture OS signals for better debugging.

## Verification Instructions

1.  **Rebuild the API**: Run `npm run build:api`.
2.  **Repackage**: Create a new Electron build and test on the client.
3.  **Check Logs**: If issues persist, refer to `%APPDATA%\milpos\api-debug.log`.
