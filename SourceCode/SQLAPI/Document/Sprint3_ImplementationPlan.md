# Sprint 3: Machine-Specific Encryption (Electron) - Implementation Plan

## Goal
Securely store sensitive authentication data (JWT Token, API Key) in the Electron app by using Windows machine-specific encryption (DPAPI). This prevents credentials from being stolen or used if the configuration files are copied to another machine.

## User Review Required
> [!IMPORTANT]
> This implementation relies on the `node-dpapi` npm package, which is a native Node.js wrapper for the Windows Data Protection API. It will only work on Windows machines.

## Proposed Changes

### Electron App (Angular Directory)
- **Install** `node-dpapi`: Add machine-specific encryption capability.
- **New File** `encryption.js`: Create a utility module for encrypting/decrypting data using DPAPI.
- **Modify** `main.js`: 
  - Integrate `encryption.js`.
  - Update `cloud-login` handler to encrypt `token` and `apiKey` before saving to `auth.json`.
  - Update `readAuthConfig()` to decrypt sensitive fields upon loading.
  - Update `startApiServer()` to pass decrypted credentials to the .NET background process via environment variables.

### .NET API (SQLAPI Directory)
- **Modify** `POS.API/Program.cs`: Update to read `TENANT_ID`, `API_KEY`, and `CLOUD_API_URL` from environment variables, allowing the Electron app to override local settings with secure, decrypted cloud credentials.

## Verification Plan

### Automated Tests
- Create a test script `test-encryption.js` to verify:
  - Encryption of a string results in a different base64 string.
  - Decryption of that base64 string returns the original string.
  - Logic to detect if a string is already encrypted.

### Manual Verification
- Perform a "Cloud Login" in the Electron app.
- Inspect the generated `auth.json` to ensure `token` and `apiKey` are encrypted.
- Restart the app and verify it still authenticates correctly (meaning decryption works).
- (Optional/Advanced) Copy `auth.json` to another machine and verify the app fails to decrypt (protecting the credentials).
