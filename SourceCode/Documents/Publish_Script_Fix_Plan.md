# Fix publish-release.ps1 for VS 18

Update the PowerShell script to correctly initialize the Visual Studio 18 environment and set the necessary flags for `node-gyp` and `electron-builder`.

## User Review Required

> [!IMPORTANT]
> The script contains a hardcoded GitHub token. We will maintain this as requested by the user, but it should be noted as a security risk.

## Proposed Changes

### Angular

#### [MODIFY] [publish-release.ps1](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/publish-release.ps1)
- Update VS detection logic to prioritize Visual Studio 18 (2026).
- Set `CL` and `LINK` environment variables with full include/lib paths to fix `CL.exe` and missing header issues.
- Set `GYP_MSVS_VERSION=18` and `MSVS_VERSION=18`.
- Ensure the `npm run electron:publish` command inherits these variables.

## Verification Plan

### Automated Tests
- Run `.\publish-release.ps1` and verify it successfully:
  - Detects the version.
  - Rebuilds `@primno/dpapi` (or passes through to the main build).
  - Completes the build process without `CL.exe` errors.
  - Starts the upload process to GitHub (it should succeed if the token is valid).
