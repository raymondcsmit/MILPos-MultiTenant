# Implementation Plan - Fix Electron i18n and API Connectivity

This plan addresses the `ERR_FILE_NOT_FOUND` for translation files and `ERR_CONNECTION_REFUSED` for the API when running the Electron version of the POS application.

## Proposed Changes

### Angular Frontend

#### [MODIFY] [app.config.ts](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/src/app/app.config.ts)
- Change the i18n prefix from `/i18n/` to `./i18n/`. This ensures that when the app is loaded via the `file://` protocol in Electron, it looks for the translation files relative to the `index.html` rather than at the root of the drive.

#### [MODIFY] [main.js](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/main.js) (Optional but recommended)
- Improve logging for the API process. Currently, errors from the API process are logged to the main process console, which might not be visible to the user.
- Ensure the API is started correctly even in semi-dev environments if necessary, or provide clearer instructions.

### Documentation

#### [NEW] [ElectronTroubleshooting.md](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Documents/ElectronTroubleshooting.md)
- Provide details on how to run both the API and Electron in development.
- Document that for `npm run electron`, the backend API must be started manually.

## Verification Plan

### Automated Tests
- None applicable for this environmental/configuration fix.

### Manual Verification
1. **i18n Fix**:
   - Build the Angular app with `./i18n/` prefix.
   - Run the Electron app.
   - Verify that `en.json` is loaded correctly (no `ERR_FILE_NOT_FOUND`).
2. **API Connectivity**:
   - Start the backend API manually (`dotnet run` in `SQLAPI/POS.API`).
   - Run `npm run electron` in `Angular`.
   - Verify that the app can connect to `http://localhost:5000`.
   - Test the packaged version (if possible) to ensure `startApi()` in `main.js` works as expected.
