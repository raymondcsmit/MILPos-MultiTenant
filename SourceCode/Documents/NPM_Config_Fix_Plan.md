# NPM Configuration Fix: msvs_version

This plan addresses the error `msvs_version is not a valid npm option` encountered when using npm 11. This error occurs because npm 11 has stricter validation for configuration options, and `msvs_version` is intended for `node-gyp` rather than npm itself.

## Proposed Changes

### Environment Configuration

The user has updated to Visual Studio 2026 (Internal Version 18). We must explicitly force the build tools to use this version to ensure compatibility and locate the correct `CL.exe`.

#### [MODIFY] System/User Environment Variables
Set the following environment variables:
- `GYP_MSVS_VERSION` = `2026` (or `18` if `node-gyp` doesn't recognize 2026 yet)
- `MSVS_VERSION` = `2026`

#### [MODIFY] Force VS 18 specifically
If `2026` is not recognized, we will use the internal version number:
- `GYP_MSVS_VERSION` = `18`
- `GYP_MSVS_OVERRIDE_PATH` = `C:\Program Files\Microsoft Visual Studio\18\Enterprise`

### Alternative Method (CMD Wrapper)

We will attempt to run the build through a CMD wrapper that sets these variables for the duration of the command.

## Verification Plan

### Manual Verification
1. Run the build with the new version overrides.
2. Verify that `electron-rebuild` successfully finds `CL.exe` in the `18` directory.
