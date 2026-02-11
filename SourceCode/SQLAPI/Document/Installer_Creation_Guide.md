# Installer Creation Guide

## Overview
This guide explains how to generate the Windows installer for MIL POS using the existing automation scripts.

## Prerequisites
- **Operating System**: Windows (Required for DPAPI native module compilation).
- **GitHub Token**: Ensure your `GH_TOKEN` is valid in `publish-release.ps1`.
- **.NET API**: The script will automatically publish the .NET API and bundle it as an extra resource.

## Preparation
Before running the installer script, always ensure the version in `package.json` is updated to avoid conflicts with previous releases on GitHub.

```json
{
  "version": "0.0.5" 
}
```

## How to Create the Installer
1.  Open **PowerShell** as Administrator.
2.  Navigate to the `SourceCode/Angular` directory.
3.  Run the publish script:
    ```powershell
    .\publish-release.ps1
    ```

## What the Script Does:
1.  **Publishes .NET API**: Packages the background service as a standalone `win-x64` executable.
2.  **Builds Angular**: Compiles the frontend code.
3.  **Electron-Builder**: 
    - Bundles `main.js`, `encryption.js`, `preload.js`, and the HTML UI files.
    - Rebuilds native modules (like `@primno/dpapi`) for the correct Electron version.
    - Produces an NSIS Installer (`.exe`) in the `release/` folder.
4.  **GitHub Upload**: Automatically uploads the installer to your GitHub Releases page.

## Verification
Once the installer is created, install it on a **clean machine** (or delete `POSDb.db` from your AppData folder) and verify that:
1.  The app launches directly into the **Cloud Setup Flow**.
2.  Authentication and Database download work as expected.
3.  The final app operates correctly with encrypted credentials.

---

## Troubleshooting

### Error: "Could not find any Visual Studio installation"
This error occurs because `@primno/dpapi` is a **native C++ module**. To build it for Electron, your machine needs C++ compilation tools.

**Solution**:
The `publish-release.ps1` script has been updated to automatically detect your Visual Studio installation and force `node-gyp` to use it.
1.  Ensure you have **Visual Studio 2022** installed with **Desktop development with C++**.
2.  Run the script again:
    ```powershell
    .\publish-release.ps1
    ```

If it still fails, check the logs to see if it detected your Visual Studio path (e.g., `C:\Program Files\Microsoft Visual Studio\2022\Enterprise`).

### Tell npm which version to use (Manual Fallback)
If the script's auto-detection fails, you can set the environment variable manually in PowerShell before running the script:
```powershell
$env:GYP_MSVS_VERSION = 2022
$env:GYP_MSVS_OVERRIDE_PATH = "C:\Program Files\Microsoft Visual Studio\2022\Enterprise" # Adjust to your edition (Community/Professional)
.\publish-release.ps1
```

### Why is this needed?
The `@primno/dpapi` library uses native C++ code to communicate with Windows security features. Electron requires this code to be compiled specifically for its environment during the build process, which only the Visual Studio compiler can do.

### Clear npm cache (If still failing)
If errors persist AFTER installing the tools above, run these commands in the `Angular` folder:
```powershell
rm -rf node_modules
rm -rf package-lock.json
npm install
.\publish-release.ps1
```
