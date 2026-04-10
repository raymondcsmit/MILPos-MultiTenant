# Work Document: NPM Config and Visual Studio Build Fix

## Executive Summary
Historically, the build process was failing due to a conflict between Visual Studio versions (2022 vs 2026/18) and strict validation in NPM 11. We have successfully overridden these issues by manually initializing the build environment with version 18 toolchains and direct compiler/linker flags.

## Changes and Fixes
1. **NPM Config Resolution**: Circumvented `msvs_version is not a valid npm option` error by using environment variables instead of `npm config`.
2. **Visual Studio Discovery**: Identified that Visual Studio 18 (2026) was installed but not being correctly targeted by standard `node-gyp` logic.
3. **Environment Overrides**: Developed a custom build script that manually sets:
   - `CL` and `LINK` flags for include/library paths.
   - `GYP_MSVS_VERSION=18` to force the targeted compiler.
   - MSVC Toolset version `14.50.35717`.
   - Windows SDK version `10.0.26100.0`.

## Verification Results
- **Native Rebuild**: `@primno/dpapi` was successfully compiled and linked.
- **Packaging**: The Electron application was successfully packaged into an NSIS installer.
- **Installer Artifact**: `release/MIL POS Setup 0.0.5.exe` has been generated.

## Files Created
- [build_and_publish.cmd](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/build_and_publish.cmd): Use this for future builds.
- [manual_rebuild.cmd](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/manual_rebuild.cmd): Use this for troubleshooting native module rebuilds.

> [!IMPORTANT]
> A final "publishing" error occurred at the very end of the process. This is expected as the system lacks the `GH_TOKEN` required to upload the artifact to GitHub. However, the build itself is **fully successful** and the local installer is ready for use in the `release` folder.
