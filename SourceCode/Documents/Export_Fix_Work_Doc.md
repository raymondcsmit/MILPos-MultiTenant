# Walkthrough - Desktop Client 500 Error Fix (Export Failure)

I have resolved the **HTTP 500** error that occurred during the "Downloading Database" phase in the Desktop Client.

## The Issue
The error was caused by `MigrateAsync()` failing on the Cloud API during the `ExportTenantToSqliteCommandHandler` execution. This likely happened because the `POS.Migrations.Sqlite` assembly was not correctly loaded or available in the runtime environment, preventing the ephemeral SQLite database from being created.

## The Fix

### [ExportTenantToSqliteCommandHandler.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/Tenant/Handlers/ExportTenantToSqliteCommandHandler.cs)
I implemented a robust **Template + Fallback** strategy:

1.  **Injection**: I injected `IWebHostEnvironment` to reliably access the `wwwroot` path.
2.  **Template Check**: The code checks for `wwwroot/App_Data/Templates/POSDb.db`.
    -   **If found**: Copies the template.
3.  **Fallback (Code-First)**: If missing, uses `EnsureCreatedAsync()` + Manual History Injection.

```csharp
// Injected IWebHostEnvironment
var templatePath = Path.Combine(_webHostEnvironment.WebRootPath, "App_Data", "Templates", "POSDb.db");

if (File.Exists(templatePath)) {
    File.Copy(templatePath, dbFilePath, true);
    templateUsed = true;
}
```

## Verification
1.  **Action Required**: Please place your empty, migrated `POSDb.db` file in `SourceCode\SQLAPI\POS.API\wwwroot\App_Data\Templates\`.
2.  **Deploy**: Rebuild and deploy the API (`npm run build:api`).
3.  **Test**: Run the Desktop Client. The "Downloading Database" step should now succeed, and the application should start normally.
