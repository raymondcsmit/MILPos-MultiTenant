# Electron Desktop Installable Version Generation — Work Document

## Executive Summary
The self-contained Electron desktop installable version (`.exe` NSIS installer) has been successfully generated using the repository's build automation PowerShell script (`SourceCode/Angular/publish-release.ps1`). The installer embeds all necessary runtime dependencies: a self-contained .NET 10 Web API backend (`POS.API.exe`), the pre-seeded SQLite database template (`POSDb.db` with 3.5 MB of comprehensive test data), the production Angular 20 SPA frontend, and the native Windows DPAPI (`@primno/dpapi`) security module compiled via MSVC 14.51.

---

## 1. Generated Release Artifacts

| Artifact | File Path | File Size | Description |
| :--- | :--- | :--- | :--- |
| **Installer Executable** | `SourceCode/Angular/release/MIL POS Setup 0.0.26.exe` | **190,762,216 bytes (~190.76 MB)** | Full Windows NSIS installer with customizable install directory |
| **Blockmap** | `SourceCode/Angular/release/MIL POS Setup 0.0.26.exe.blockmap` | 197,454 bytes | Differential update blockmap for Electron Auto-Updater |
| **Unpacked Application** | `SourceCode/Angular/release/win-unpacked/MIL POS.exe` | — | Unpacked binary directory for rapid testing |
| **Bundled API Executable** | `.../win-unpacked/resources/api/POS.API.exe` | 162,304 bytes | Self-contained .NET 10 standalone Web API executable |
| **Bundled Database** | `.../win-unpacked/resources/api/POSDb.db` | **3,502,080 bytes** | Single-tenant SQLite database template with complete seed data |

---

## 2. Bundled Dependencies & Technical Architecture

1. **Host Shell**: Electron `v40.3.0` (Node.js runtime + Chromium) configured with custom splash screen, login flow, and secure context isolation.
2. **Backend Engine**:
   - .NET 10 standalone Web API (`win-x64`) with all runtime assemblies embedded.
   - Requires **no external .NET SDK or runtime** on client machines.
   - Incorporates all defect fixes up to BUG-22 (sequential order numbering zero padding, damaged stock availability check, product stock authorization, import-export authorization, customer ledger sorting, etc.).
3. **Embedded Database**:
   - Seed database template (`POSDb.db`, 3.5 MB) packaged into `resources/api/POSDb.db`.
   - On initial launch, `main.js` automatically copies the template to `%AppData%\milpos\POSDb.db`.
4. **Frontend SPA**:
   - Angular 20 SPA compiled with `--configuration=electron --base-href ./`.
   - Bundled inside `resources/app.asar/dist/`.
5. **Native Security Bridge**:
   - Windows Data Protection API (`@primno/dpapi`) C++ native addon rebuilt with MSVC 14.51 (`C:\Program Files\Microsoft Visual Studio\18\Enterprise\VC\Tools\MSVC\14.51.36231`) and Windows SDK `10.0.26100.0`.
   - Machine-bound encryption of offline sync credentials in `%AppData%\milpos\auth.json`.

---

## 3. Pre-Seeded User Accounts & Login Credentials

All users below are pre-seeded and active in `POSDb.db`:

### Primary User Accounts

| Role | Name | Email / Username | Default Password | Access Level & Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Waqar Habib | `admin@gmail.com` | `Admin@123` *(or `admin@123`)* | Full master privileges (`IsSuperAdmin = 1`), tenant management, all claims, all locations |
| **Admin** | Mansoor Habib | `mansoor@gmail.com` | `Admin@123` *(or `admin@123`)* | Store administrative capabilities, inventory adjustments, purchase & sales approvals |
| **Employee** | Muhammad ILLYAAS | `employee@gmail.com` *(login: `mikhan10@gmail.com`)* | `Admin@123` *(or `admin@123`)* | POS cashier terminal, sales orders, customer checkout (`DefaultUserId: 1A5CF5B9-EAD8-495C-8719-2D8BE776F452`) |

### Cloud / Sync Staging Test Account

| Role | Name | Email | Default Password | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Store Alpha Admin** | User Alpha | `admin@store-alpha.com` | `Admin123!` | Used for Cloud Sync and database download verification |

---

## 4. Pre-Seeded Data Catalog Summary

The bundled `POSDb.db` (3,502,080 bytes) contains pre-configured records across all modules:

### 1. Multi-Tenancy & Store Profile
- **Tenant ID**: `00000000-0000-0000-0000-000000000001` (`POS Main APP`, subdomain: `pos-main-app`).
- **Company Profile**: Pre-configured store title, contact details, currency symbol, and logo path.

### 2. Locations & Warehouses
- **Main Location**: Warehouse / Main Store Location (`IsAllLocations = 1` assigned to Admin).

### 3. Chart of Accounts (Ledger Accounts)
- **1010**: Cash in Hand (Asset)
- **1020**: Bank Account (Asset)
- **1100**: Accounts Receivable / Debtors (Asset)
- **1150 / 1150-01**: GST Input Tax Receivable (Asset)
- **1200**: Inventory Asset / Stock (Asset)
- **2100**: Accounts Payable / Creditors (Liability)
- **2150 / 2150-01**: GST Output Tax Payable (Liability)
- **4100**: Sales Revenue / Income (Income)
- **4200**: Discount Received (Income)
- **5100**: Cost of Goods Sold / COGS (Expense)
- **5555**: Opening Balance Adjustment (Equity / Capital)

### 4. Product Catalog & Inventory
- **Product Categories**: Agricultural (Fertilizers, Seeds, Pesticides, Farm Tools), Retail & Agro-chemicals.
- **Units of Measure (UOM)**: Kg, Bag, Liter, Piece, Box, Pack.
- **Tax Rates**: Standard GST (17% / 18%), Sales Tax, and Zero/Exempt (0%).
- **Products**: Complete catalog with SKU codes, barcodes, purchase prices, sales prices, and location-based stock levels.

---

## 5. Build Execution Logs & Script Enhancements

### Script Updates in `SourceCode/Angular/publish-release.ps1`
- Added parameter block `param([switch]$NonInteractive = $false, [switch]$SkipPublish = $false)`.
- If `$SkipPublish` is specified, runs local build `npm run electron:package -- -c.npmRebuild=false` producing the full NSIS `.exe` installer without network failure risks.
- Replaced unconditional `Pause` at script end with `if (-not $NonInteractive -and [Environment]::UserInteractive) { Pause }` to ensure zero hanging in automated environments.

### Execution Log Snippet
```
GitHub Token and VS 18 Environment Initialized.
Preparing to publish version: 0.0.26
Rebuilding native modules for Electron...
Detected Electron version: 40.3.0
• executing @electron/rebuild  electronVersion=40.3.0 arch=x64
• preparing       moduleName=@primno/dpapi arch=x64
• finished        moduleName=@primno/dpapi arch=x64
• packaging       platform=win32 arch=x64 electron=40.3.0 appOutDir=release\win-unpacked
• signing with signtool.exe  path=release\win-unpacked\resources\api\POS.API.exe
• building        target=nsis file=release\MIL POS Setup 0.0.26.exe archs=x64 oneClick=false perMachine=false
• building block map  blockMapFile=release\MIL POS Setup 0.0.26.exe.blockmap
----------------------------------------
SUCCESS: Release 0.0.26 generated successfully!
----------------------------------------
```

---

## 6. How to Run & Verify the Desktop Installer

1. **Direct Installation**:
   - Double-click `SourceCode/Angular/release/MIL POS Setup 0.0.26.exe`.
   - Select installation directory (or accept default `%LocalAppData%\Programs\milpos`).
   - The setup will extract the application and create desktop and start menu shortcuts.
2. **Initial Launch**:
   - On launch, the splash screen appears while `main.js` starts `resources/api/POS.API.exe`.
   - The embedded `POSDb.db` is copied to `%AppData%\milpos\POSDb.db`.
   - The login window loads at `http://localhost:5000` (or embedded window).
3. **Login**:
   - Enter `admin@gmail.com` / `Admin@123`.
   - Verify dashboard widgets, POS terminal, product catalog, sales orders, and reports.
