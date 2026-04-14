# Work Document: SPA Middleware / Login Error Fix

## Problem
When attempting to log in via the Cloud Setup screen in the Electron app, the application encountered an `InvalidOperationException` in the SPA middleware. 

### Root Causes
1.  **Endpoint Mismatch**: The Electron `main.js` was calling `/api/authentication/login`, whereas the API was configured to listen on `/api/authentication`.
2.  **Fallback Trigger**: The mismatch caused a 404, which in an ASP.NET Core SPA template, triggers a fallback to serve `index.html`.
3.  **Missing File**: The API process did not have access to the Angular `index.html` in its local directory, causing the crash.
4.  **Middleware Block**: The `TrialEnforcementMiddleware` was not explicitly allowing the authentication routes, creating a potential blockade.

## Solutions Implemented
We synchronized the routing and updated the safety policies in the API.

### 1. Electron Alignment
- **File**: `Angular/main.js`
- **Change**: Updated the Cloud Login `axios` call to use the correct endpoint: `/api/authentication`.

### 2. API Robustness
- **File**: `SQLAPI/POS.API/Controllers/Authentication/AuthenticationController.cs`
- **Change**: Added `[HttpPost("authentication/login")]` as an alias to ensure both `/api/authentication` and `/api/authentication/login` work seamlessly.

### 3. Middleware Update
- **File**: `SQLAPI/POS.API/Middleware/TrialEnforcementMiddleware.cs`
- **Change**: Added both authentication endpoints to the `_allowedPaths` list to ensure login is always accessible.

## Verification
To apply these changes and verify the fix:
1.  **Rebuild**: Run `.\publish-release.ps1` in the `Angular` folder. This will rebuild the API with the new routes and package them into the Electron installer.
2.  **Install**: Run the new installer.
3.  **Login**: Perform the Cloud Login flow. It will now correctly hit the API, receive the token, and proceed with the database setup.
