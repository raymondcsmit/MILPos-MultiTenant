# User Profile Permission Fix Walkthrough

## Changes Made
### POS.API
#### `Startup.cs`
- **Added Static File Source**: Configured `StaticFileOptions` to serve files from `ProgramData/MILPOS/wwwroot` in addition to the default `wwwroot`. This ensures files saved to the application data folder (writable by non-admin users) are accessible via the API.

### POS.MediatR
#### `UpdateUserProfileCommandHandler.cs`
- **Fallback Logic**: Implemented a try-catch block for `UnauthorizedAccessException` when saving profile photos.
- **Alternate Path**: If access to the installation directory (`WebRootPath`) is denied, the handler now saves the image to `ProgramData/MILPOS/wwwroot/Users`.
- **File Cleanup**: Added logic to check both locations when deleting old profile photos to prevent orphans.

## Changes Diff
```csharp
// Startup.cs
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "MILPOS", "wwwroot")),
    RequestPath = ""
});

// UpdateUserProfileCommandHandler.cs
try
{
    await File.WriteAllBytesAsync(fullPath, bytes);
}
catch (UnauthorizedAccessException)
{
     // Fallback to ProgramData
     var appDataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "MILPOS", "wwwroot", _pathHelper.UserProfilePath);
     // ... create directory and save
}
```

## Verification Results
### Manual Verification Steps
1.  **Launch Electron App**: Run the application in a standard user context (not as Administrator) - typically installed in `Program Files`.
2.  **Update Profile**: Go to User Profile settings and upload a new photo.
3.  **Verify Success**: The operation should succeed without an "Access is denied" error.
4.  **Verify Persistence**: Restart the app and check if the profile photo still loads.
5.  **Check File Location**: Verify the file is created in `%ProgramData%\MILPOS\wwwroot\Users` instead of `Program Files`.
