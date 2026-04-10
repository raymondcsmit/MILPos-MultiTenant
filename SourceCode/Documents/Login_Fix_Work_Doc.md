# Walkthrough - Client Login Fix

I have resolved the issue where the client was unable to login after setting up the Desktop application.

## The Issue

The **Desktop Client** relies on a local `appsettings.json` file which is generated during the **Export** process from the Cloud API.
-   When the user "Downloads" the database, the Cloud API generates a zip file containing `POSDb.db` and `appsettings.json`.
-   The previous implementation of `ExportTenantToSqliteCommandHandler` generated `appsettings.json` with database connection strings but **omitted the `JwtSettings`**.
-   The Local API requires `JwtSettings` (Key, Issuer, Audience) to sign and validate authentication tokens.
-   **Result**: The local API started successfully, but login attempts failed because it couldn't generate valid tokens (missing signing key).

## The Fix

### [ExportTenantToSqliteCommandHandler.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/Tenant/Handlers/ExportTenantToSqliteCommandHandler.cs)

1.  **Injected `IConfiguration`**: Updated the handler to accept `IConfiguration` via Dependency Injection.
2.  **Included `JwtSettings`**: Modified the export logic to read the current `JwtSettings` from the Cloud API configuration and include them in the generated `appsettings.json`.

```csharp
// Logic added to ExportTenantToSqliteCommandHandler.cs
var jwtSettings = new Dictionary<string, string>();
_configuration.GetSection("JwtSettings").Bind(jwtSettings);

var appSettings = new
{
    // ...
    JwtSettings = jwtSettings,
    // ...
};
```

## Verification
1.  **Build**: The `POS.MediatR` and `POS.API` projects compile successfully with the changes.
2.  **Action Required**:
    -   Redeploy the Cloud API.
    -   Asking the client to **Re-Download** the workspace/database on their Desktop App.
    -   This will fetch the new `appsettings.json` with valid JWT configuration.
    -   Login should now succeed locally.
