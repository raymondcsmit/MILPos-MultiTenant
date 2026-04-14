# Walkthrough - Web Deployment 500.30 Fix

I have resolved the HTTP 500.30 startup error that occurred when deploying the API to a web server (IIS).

## The Issue
The error was caused by code in `Startup.cs` that unconditionally attempted to access and create directories in the user's `AppData` folder (`Environment.SpecialFolder.ApplicationData`) to serve static files.

On a typical web server:
- The Application Pool identity (e.g., `IIS AppPool\DefaultAppPool`) often does not have a user profile loaded.
- It lacks permissions to access `C:\Users\...\AppData`, causing the application to crash immediately upon startup.

## The Fix

### [Startup.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Startup.cs)
I wrapped the conflicting code block in a conditional check for **Desktop Mode**:

```csharp
// Get deployment settings first (Moved up)
var deploymentSettings = app.ApplicationServices.GetService<Microsoft.Extensions.Options.IOptions<DeploymentSettings>>()?.Value;

// Serve files from ProgramData/MILPOS/wwwroot ONLY in Desktop mode
if (deploymentSettings?.DeploymentMode == "Desktop")
{
    var appDataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "milpos", "wwwroot");
    // ... directory creation and mapping logic ...
}
```

This change ensures that:
1.  **Web Deployments**: Use the standard `wwwroot` folder and do *not* touch user directories, preventing the crash.
2.  **Desktop App**: Continues to use the `AppData` folder for writable static content, preserving Electron functionality.

## Verification
- **Web**: Deploy the updated build to your server. The 500.30 error should be resolved, and the API should start normally.
- **Desktop**: The desktop application continues to function as before.
