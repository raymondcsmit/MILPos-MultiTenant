# Sprint 4: Cloud Login & Auto-Download (Electron) - Implementation Plan

## Goal
Enable a seamless first-time setup experience for the Electron app. When the app is launched on a new machine without a local database, it will prompt the user to log in to their cloud account, automatically download their tenant's database and configuration, and then transition to offline mode.

## User Review Required
> [!IMPORTANT]
> The app will require an active internet connection for the initial cloud login and database download. Once the setup is complete, the app can operate entirely offline.

## Proposed Changes

### Electron App (Angular Directory)
- **Install** `axios` and `adm-zip`: For network requests and ZIP extraction.
- **New File** `login.html`: Create a dedicated cloud login page with modern aesthetics.
- **New File** `splash.html`: Create a setup progress page with a loading bar.
- **Modify** `main.js`:
  - Enhance `startApi()` to detect missing `POSDb.db` and trigger the download flow.
  - Implement `cloud-login` IPC handler to automate:
    - Authentication with Cloud API.
    - Encrypted storage of `auth.json` (using Sprint 3 logic).
    - Downloading of the tenant database ZIP.
    - Extraction of `POSDb.db` and `appsettings.json` to the user's data folder.
    - Transitioning to the regular application window.

### .NET API (SQLAPI Directory)
- No changes required (Backend was prepared in Sprint 2).

## Verification Plan

### Manual Verification
1.  **First Run**: Delete the local `POSDb.db` from `app.getPath('userData')`.
2.  **Cloud Login**: Launch the app, verify the login screen appears.
3.  **Download Flow**: Enter valid cloud credentials and watch the progress bar.
4.  **Auto-Setup**: Verify that once the download completes, the app automatically switches to the main screen and shows the tenant's data.
5.  **State Persistence**: Restart the app and verify it goes directly to the main screen (offline mode) without asking for login again.
