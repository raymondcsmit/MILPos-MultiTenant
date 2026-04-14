# Fix API Startup Failure on Desktop

The background API process is exiting immediately after being spawned in the Electron app on desktop machines. This is likely due to permissions issues or shell execution problems.

## Technical Analysis

1.  **Permissions**: `Startup.cs` currently uses `CommonApplicationData` (`C:\ProgramData`), which often prevents standard users from creating folders. We need to switch to `ApplicationData` (`%APPDATA%`).
2.  **Process Spawn**: Using `shell: true` in Node's `spawn` helps resolve issues with paths containing spaces and arguments on Windows.
3.  **Logging**: The `exit` code `null` is ambiguous. Logging the `signal` along with the `code` will help identify if the process was killed by the OS or a signal.

## Proposed Changes

### API Project

#### [MODIFY] [Startup.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Startup.cs)
- Change `SpecialFolder.CommonApplicationData` to `SpecialFolder.ApplicationData` on line 338.

### Electron Project

#### [MODIFY] [main.js](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/main.js)
- Update `spawn` to use `shell: true`.
- Update the `exit` event listener to log both `code` and `signal`.
- Wrap the `--ConnectionStrings:SqliteConnectionString` argument in double quotes to handle spaces.

## Verification Plan

### Manual Verification
1. Rebuild and repackage the application.
2. Test on a client machine.
3. Check `api-debug.log` for more detailed exit information if it still fails.
