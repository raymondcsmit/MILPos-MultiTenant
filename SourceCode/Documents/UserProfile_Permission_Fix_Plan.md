# User Profile Image Permission Fix Plan

## Goal Description
Fix `System.UnauthorizedAccessException` when saving user profile pictures in the Electron application. The error occurs because the application attempts to write to `C:\Program Files\MIL POS\resources\api\wwwroot\Users\`, which is a protected system directory requiring administrator privileges.

## Root Cause
The `UpdateUserProfileCommandHandler` uses `_webHostEnvironment.WebRootPath`, which resolves to the installation directory in Electron apps. Writing to the installation directory (Program Files) is bad practice and often blocked by OS permissions.

## Proposed Changes
### POS.MediatR
#### [MODIFY] [UpdateUserProfileCommandHandler.cs](file:///F:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/User/Handlers/UpdateUserProfileCommandHandler.cs)
- Add try-catch block for `UnauthorizedAccessException`.
- If caught, attempt to save to `Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "MILPOS", "wwwroot", "Users")`.
- **Crucial**: If we save elsewhere, we must ensure the `appUser.ProfilePhoto` stores a useful path/URL. If the static file server doesn't know about `AppData`, the image won't load.

**Alternative Strategy (Simpler for now)**:
Use `AppData` for storage and a custom controller action to serve the image, OR continue using `wwwroot` but advise the user to run the app as admin (bad UX).

**Chosen Strategy**:
Modify `UpdateUserProfileCommandHandler` to catch the `UnauthorizedAccessException`. Since this is an Electron app wrapping a .NET API, the "correct" long-term fix is to configure the `ContentRoot` or `WebRoot` to be in `AppData` at startup.

**HOWEVER**, checking `UpdateCompanyProfileCommandHandler.cs`, I see I just modified it. Does it have the same issue? Yes, it likely will.

**Refined Plan**:
1. Check if `_webHostEnvironment.WebRootPath` contains "Program Files".
2. If so, redirect storage to `Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData)` or logical equivalent, ensuring the API can serve files from there.
3. **ACTUALLY**, the easiest fix for the user *right now* related to the specific file write is to try/catch and perhaps log a clearer error, OR verify if `UpdateCompanyProfile` works (as user implied "it saved successfully" in previous turns, but maybe that was dev mode).

**Let's look at `PathHelper` again.** It reads paths from config.

**Revised Plan**:
Modify `UpdateUserProfileCommandHandler.cs` to specificially check for write permissions or try to write. If it fails, we need a better strategy.
Wait, the user is running `localhost:5000` but the error shows `C:\Program Files...`. This means the *backend* is running from the installed location while the frontend might be separate? No, the error stack trace shows `POS.MediatR.User.Handlers.UpdateUserProfileCommandHandler.Handle`.

**Conclusion**: The backend API is indeed running from Program Files.
**Fix**: We must soft-fail or logging is not enough. We need to write to a writable path.
But if we write to `%APPDATA%`, the `static file middleware` won't serve it unless configured.

**Action**:
I will implement a check. If `WebRootPath` is not writable, fall back to `Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "MILPOS", "wwwroot")`.
AND I need to ensure the API knows to look there. This is complex.

**Simpler Fix for User**:
1.  Verify if `C:\Program Files\MIL POS\resources\api\wwwroot` exists.
2.  The error is `Access to the path ... is denied`.
3.  I will change code to attempt to set permissions? No, that requires admin.
4.  I will change code to save to `AppData` and update the `appUser.ProfilePhoto` path to be absolute or handle serving differently? No, the frontend expects a relative URL.

**Hypothesis**: The user is running the "Cloud" build locally or the "Desktop" build which puts everything in Program Files.
The best way to fix this without architectural changes is to catch the error and return a meaningful message, OR if this is critical, we must use `AppData`.

**Let's try to use `Environment.SpecialFolder.CommonApplicationData` (ProgramData) which *might* be writable by users if permissions are set, or `LocalApplicationData` (AppData/Local).**

If I save to `AppData/Local/MILPOS/wwwroot/Users/...`, I need to tell the StaticFiles middleware to serve from there too.

**Let's check `Startup.cs` or `Program.cs` to see how StaticFiles are configured.**

**For now**, I will start by creating the plan to investigate `Startup.cs` and then fix the handler.

## Proposed Changes
### POS.MediatR
#### [MODIFY] [UpdateUserProfileCommandHandler.cs](file:///F:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/User/Handlers/UpdateUserProfileCommandHandler.cs)
- Add try-catch block for `UnauthorizedAccessException`.
- If caught, attempt to save to `Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "MILPOS", "wwwroot", "Users")`.
- **Crucial**: If we save elsewhere, we must ensure the `appUser.ProfilePhoto` stores a useful path/URL. If the static file server doesn't know about `AppData`, the image won't load.

**Alternative**: Use a base64 string for the profile photo in the DB? No, DB field is `ProfilePhoto` (string, likely filename).

**Decision**: I will first look at `Startup.cs` to see if I can easily add another static file source.

## Verification Plan
1. Check `Startup.cs`.
2. Modify `UpdateUserProfileCommandHandler.cs`.
