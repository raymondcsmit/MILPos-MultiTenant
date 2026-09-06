# Electron Desktop Installable Version Generation — Implementation Plan

## Executive Summary
This implementation plan defines the complete workflow to generate the self-contained Electron desktop installable installer (`.exe` NSIS package) for MIL POS with all dependencies included. The packaging process leverages the repository's established build automation PowerShell script (`SourceCode/Angular/publish-release.ps1`), incorporating all recent backend bug fixes (BUG-01 through BUG-22), the single-tenant SQLite database template (`POSDb.db` with complete test data), the compiled Angular 20 SPA frontend, and the native `@primno/dpapi` module compiled for Electron via the Visual Studio 18 toolchain.

---

## Technical Context & Architecture

### 1. Packaging Architecture
- **Host / Wrapper**: Electron runtime (v34+ / Node.js native bridge) packaged via `electron-builder`.
- **Backend API**: ASP.NET Core (.NET 10) self-contained `win-x64` standalone executable (`POS.API.exe`).
  - No external .NET SDK or runtime required on client machines.
  - Bundled inside installer via `extraResources` mapping to `resources/api/`.
- **Database**: Bundled SQLite database (`POSDb.db`, 3.5 MB) packaged into `resources/api/` and auto-provisioned to `%AppData%/milpos/POSDb.db` on first run.
- **Frontend SPA**: Angular 20 SPA compiled with `--configuration=electron --base-href ./`, packaged via `files` mapping into `dist/`.
- **Security & Native Modules**: Windows Data Protection API (`@primno/dpapi`) native C++ module compiled specifically for Electron using MSVC 14.51 / Windows SDK 10.0.26100.
- **Output Installer**: NSIS Windows installer (`MIL POS Setup <version>.exe`) with customizable installation directory and automatic updater integration (`latest.yml`).

---

## Detailed Implementation Steps

### Phase 1: Preparation & Version Increment
1. **Version Bump**:
   - Update `SourceCode/Angular/package.json` version from `0.0.25` to `0.0.26`.
   - Existing releases in `release/` range from `0.0.1` to `0.0.25`. Version `0.0.26` creates a clean, collision-free release artifact `MIL POS Setup 0.0.26.exe`.
2. **Preserve Verified Test Database**:
   - Verify `SourceCode/SQLAPI/POS.API/POSDb.db` remains intact (3,502,080 bytes) containing full test accounts, products, transactions, and categories.

### Phase 2: Automation Script Refinement (`publish-release.ps1`)
1. **Parameterize Script Execution**:
   - Add optional parameters to `publish-release.ps1`:
     ```powershell
     param(
         [switch]$NonInteractive = $false,
         [switch]$SkipPublish = $false
     )
     ```
   - Guard line 121 `Pause` with `if (-not $NonInteractive -and [Environment]::UserInteractive) { Pause }` to prevent non-interactive/automated runners from hanging.
   - Allow `$SkipPublish` to execute `npm run electron:package -- -c.npmRebuild=false` (local `.exe` installer generation only) or `$SkipPublish = $false` to execute `npm run electron:publish -- -c.npmRebuild=false` (generates installer and publishes release to GitHub).

### Phase 3: Build & Packaging Execution
1. **Native Module Toolchain Initialization**:
   - Set environment variables for MSVC 14.51 (`C:\Program Files\Microsoft Visual Studio\18\Enterprise\VC\Tools\MSVC\14.51.36231`) and Windows SDK `10.0.26100.0`.
   - Execute `npm rebuild @primno/dpapi --runtime=electron --target=<electronVersion> --dist-url=https://electronjs.org/headers --build-from-source`.
2. **Backend Compilation & Self-Contained Publish**:
   - Execute `dotnet publish ../SQLAPI/POS.API/POS.API.csproj -c Release -r win-x64 --self-contained true`.
   - Verifies all recent bug fixes (BUG-01 to BUG-22: order numbering zero padding, damaged stock check, endpoint claim security, customer ledger sorting, etc.) are compiled into the binary.
   - Copies `POSDb.db` into the publish folder.
3. **Frontend Compilation**:
   - Execute `npx ng build --configuration=electron --base-href ./`.
   - Outputs compiled bundles to `../SQLAPI/POS.API/ClientApp/browser`.
4. **Electron-Builder Installer Packaging**:
   - Assemble resources into NSIS installer via `electron-builder`.
   - Produces `SourceCode/Angular/release/MIL POS Setup 0.0.26.exe` (~190 MB) and blockmap/manifest.

### Phase 4: Verification & Validation
1. **Installer Artifact Existence**:
   - Verify `MIL POS Setup 0.0.26.exe` exists in `SourceCode/Angular/release/`.
   - Verify file size exceeds 180 MB (confirming all self-contained .NET runtime binaries, SQLite DB, Angular bundles, and Electron dependencies are bundled).
2. **Inspection of Packaged Dependencies**:
   - Verify `win-unpacked/resources/api/POS.API.exe` exists.
   - Verify `win-unpacked/resources/api/POSDb.db` exists.
   - Verify `win-unpacked/resources/app.asar` contains `main.js`, `dist/`, and compiled `@primno/dpapi`.
3. **Documentation**:
   - Author `SourceCode/SQLAPI/Document/Electron_Desktop_Installer_Generation_WorkDocument.md`.
   - Update `walkthrough.md`.

---

## User Review & Approval
In accordance with `<RULE[user_global]>` and Planning Mode guidelines, execution will pause for user review and approval of this plan before executing the packaging workflow.
