# Auto-Update Implementation Plan

## Overview
This document outlines the steps to enable auto-updates for the POS Electron application using `electron-updater`. This will allow users to automatically receive and install new versions of the application.

## 1. Prerequisites
Install the necessary packages:
```bash
npm install electron-updater electron-log
```
*   `electron-updater`: Handles the update logic.
*   `electron-log`: Crucial for debugging update issues in production.

## 2. Code Changes

### A. Update `package.json`
Configure the `publish` provider. For GitHub Releases (recommended for easiest setup), add this to the `build` section:

```json
"build": {
  "publish": [
    {
      "provider": "github",
      "owner": "YOUR_GITHUB_USERNAME",
      "repo": "YOUR_REPO_NAME"
    }
  ],
  // ... existing configuration ...
}
```
*   *Note: If using a generic server (e.g., IIS, S3), the provider would be "generic" and require a `url`.*

### B. Modify `main.js`
Integrate the auto-updater logic into the main process.

1.  **Imports**:
    ```javascript
    const { autoUpdater } = require('electron-updater');
    const log = require('electron-log');
    ```

2.  **Configure Logger**:
    ```javascript
    autoUpdater.logger = log;
    autoUpdater.logger.transports.file.level = 'info';
    log.info('App starting...');
    ```

3.  **Add Event Listeners** (Add this before `createWindow` or inside `app.on('ready')`):
    ```javascript
    function setupAutoUpdater() {
      // Check for updates and notify user
      autoUpdater.checkForUpdatesAndNotify();

      autoUpdater.on('update-available', () => {
        log.info('Update available.');
        dialog.showMessageBox({
          type: 'info',
          title: 'Found Updates',
          message: 'Found updates, do you want update now?',
          buttons: ['Sure', 'No']
        }).then((buttonIndex) => {
          if (buttonIndex.response === 0) {
            autoUpdater.downloadUpdate();
          }
        });
      });

      autoUpdater.on('update-downloaded', () => {
        log.info('Update downloaded');
        dialog.showMessageBox({
          title: 'Install Updates',
          message: 'Updates downloaded, application will be quit for update...'
        }).then(() => {
          setImmediate(() => autoUpdater.quitAndInstall());
        });
      });
    }
    ```

4.  **Initialize**: Call `setupAutoUpdater()` inside `createWindow()` or `app.on('ready', ...)`.

## 3. Code Signing (CRITICAL)
**Auto-updates on Windows require code signing.**
Without a valid code signing certificate (EV or Standard), the auto-update process may fail or be blocked by SmartScreen.
*   **Self-signed certificates** generally do *not* work for auto-updates without manual trust installation on every client machine.
*   **Recommendation**: Purchase a code signing certificate if you intend to distribute this widely.

## 4. Release Workflow
To publish an update:
1.  Update the `version` in `package.json` (e.g., `0.0.1` -> `0.0.2`).
2.  Run the publish command:
    ```bash
    npm run electron:build -- --publish always
    ```
    *   *Note: This usually requires setting `GH_TOKEN` environment variable if using GitHub.*
3.  This command builds the app, generates the `latest.yml` blockmap, and uploads the `.exe` and `.yml` files to the release.

## 5. Generic Server Option (If not using GitHub)
If you host files on your own server (e.g., `https://updates.example.com/`):
1.  **Provider**: Set `"provider": "generic"` and `"url": "https://updates.example.com/"`.
2.  **Upload**: Manually upload the generated `.exe` and `latest.yml` files to that URL after building.
