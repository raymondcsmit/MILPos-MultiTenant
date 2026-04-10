# Walkthrough - API Connection Fixes for Electron

I have implemented several fixes to address the `net::ERR_CONNECTION_REFUSED` issue and improve diagnostics for the Electron application.

## Changes Made

### API Project

#### [Program.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Program.cs)
- Fixed the Hangfire SQLite connection string in Desktop mode by adding the missing `Data Source=` prefix.
- This ensures Hangfire initializes correctly and doesn't cause a startup crash.

#### [Startup.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Startup.cs)
- Conditionally disabled `app.UseHttpsRedirection()` when running in Desktop mode.
- In Desktop mode, the API typically only listens on HTTP (port 5000). Forcing a redirection to HTTPS (port 5001) was likely causing the "Connection Refused" error as the HTTPS port was not active.

### Electron Project

#### [main.js](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/main.js)
- Improved the API process logging. Both `STDOUT` and `STDERR` from the background API are now captured and written to the `api-debug.log` file.
- This will make it much easier to debug if the API fails to start on a client machine.

## Verification Instructions

1.  **Rebuild the API**: Run `npm run build:api` in the `Angular` folder.
2.  **Repackage Electron**: Build and package your Electron application.
3.  **Test on Client**: Install the new version on the client machine and verify login.
4.  **Diagnostics**: If issues persists, check `%APPDATA%\milpos\api-debug.log`. It now contains detailed STDOUT/STDERR from the API.
