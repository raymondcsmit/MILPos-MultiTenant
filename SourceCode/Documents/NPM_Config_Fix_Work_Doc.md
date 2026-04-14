# Work Document: Resolving Visual Studio Version Conflict in Build Process

## Issue Summary
The build process (npm, node-gyp, and electron-builder) was failing with the error:
`TRACKER : error TRK0005: Failed to locate: "CL.exe"`

Our investigation revealed that the system has two Visual Studio directories:
1. `C:\Program Files\Microsoft Visual Studio\2022` (Correct & Complete)
2. `C:\Program Files\Microsoft Visual Studio\18` (Faulty/Incomplete, likely a remnant or preview)

The build tools incorrectly default to the "18" path, which does not contain the required C++ compiler (`CL.exe`). Because NPM 11 has strict validation, traditional local `.npmrc` overrides are being ignored or causing additional errors.

## Solution

To resolve this, you must explicitly tell Windows to use Visual Studio 2022 for all build processes.

### Step 1: Set System Environment Variables (Recommended)
This is the most permanent and reliable fix.

1. Open **Start Menu**, search for "Edit the system environment variables".
2. Click **Environment Variables**.
3. Under **User variables** (or System variables), click **New** and add:
   - Variable name: `GYP_MSVS_VERSION`
   - Variable value: `2022`
4. Click **New** again and add:
   - Variable name: `MSVS_VERSION`
   - Variable value: `2022`
5. **CRITICAL:** Restart your terminal (VS Code, PowerShell, or CMD) for these changes to take effect.

### Step 2: Alternative - Use Developer Command Prompt
Instead of a regular PowerShell window, use the **Developer PowerShell for VS 2022** or **Developer Command Prompt for VS 2022** from your Start Menu. This shell comes with all correct paths pre-configured.

### Step 3: Verify the Fix
After setting the variables and restarting your terminal, run:
```powershell
$env:GYP_MSVS_VERSION  # Should output 2022
npm run electron:publish
```

## Actions Taken
- Identified the VS 18 vs 2022 conflict.
- Attempted to override via local `.npmrc` (Rejected by NPM 11 validation).
- Attempted to pass variables via shell session (Sub-processes failed to inherit consistently).
- Verified MSVC tools existence in VS 2022 folder (`14.44.35207`).
- Verified API and Angular builds succeed independently when native modules are bypassed.
