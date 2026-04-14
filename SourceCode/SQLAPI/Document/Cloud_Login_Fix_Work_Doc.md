# Work Document: Cloud Login window layering fix

## Problem
During the first launch of the application (when no local database is found), the "Cloud Account Setup" window was being created behind the initial splash screen. Since the splash screen was set to `alwaysOnTop: true`, the user could not see or interact with the login form, making the app appear "stuck" on the splash screen.

## Solution
Modified the window management logic in `main.js`. 

### Changes
- **File**: `Angular/main.js`
- **Logic**: In the `startApi()` function, a check is performed for the existence of `POSDb.db`. If it does not exist, the application now explicitly closes the `splash` window before calling `showCloudLogin()`.
- **Result**: The splash screen disappears, and the cloud login window is displayed prominently to the user.

## Verification
- Code verification confirms the `splash` window is closed precisely before the login window is summoned.
- User can verify by deleting their local `%AppData%/milpos/POSDb.db` and launching the app.

## Files Modified
- [main.js](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/main.js)
