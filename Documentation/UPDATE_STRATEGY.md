# Electron Auto-Update Strategy & Implementation Plan (GitHub Releases)

## Overview
We have implemented an auto-update system using `electron-updater` with the **GitHub** provider. This allows your application to:
1.  Check for updates automatically on startup by querying your GitHub repository.
2.  Download the new version in the background directly from GitHub Releases.
3.  Notify the user when the update is ready.
4.  Restart and install the update.
5.  Automatically apply any Database Migrations (SQL/Schema changes) upon the next startup.

## How it Works
1.  **Electron App**: Checks the GitHub API for the latest release in your repository.
2.  **Comparison**: Compares the version of the latest release with the current app version.
3.  **Update**: If a newer version exists, it downloads the assets (installer) from GitHub.
4.  **Database**: When the updated app starts, the .NET API (`Program.cs`) runs `context.Database.Migrate()`, ensuring the SQLite database schema matches the new code.

## Prerequisites
-   **GitHub Repository**: You must have a public (or private, with token) GitHub repository.
-   **Code Signing (Optional but Recommended)**: To avoid "Unknown Publisher" warnings.
-   **Consistent Versioning**: You must increase the `version` in `package.json` for every new release.

---

## Configuration Steps (One-Time)

### 1. Update `package.json` Repository URL
You must set the correct GitHub repository URL in `SourceCode/Angular/package.json`.
Find the `repository` section and update it with your actual details:
```json
"repository": {
  "type": "git",
  "url": "https://github.com/YOUR_USERNAME/YOUR_REPO_NAME"
}
```

---

## Deployment Instructions (Routine)

### 1. Update Version
Open `SourceCode/Angular/package.json` and increment the version number:
```json
"version": "1.0.1", 
```

### 2. Build the Application
Run the release build command:
```bash
npm run electron:package
```
This will generate the installer and update files in the `release` folder:
-   `MIL POS Setup 1.0.1.exe`
-   `latest.yml`
-   `latest.yml.blockmap`

### 3. Publish to GitHub
You can publish the release in two ways:

#### Option A: Manual Upload (Easiest for starting)
1.  Go to your GitHub Repository > **Releases** > **Draft a new release**.
2.  **Tag version**: Create a new tag (e.g., `v1.0.1`).
3.  **Release title**: Enter the version or a title (e.g., `v1.0.1`).
4.  **Description**: Add release notes (optional).
5.  **Attach binaries**: Drag and drop the files from your `release` folder:
    -   `MIL POS Setup 1.0.1.exe`
    -   `latest.yml` (Crucial for auto-update)
    -   `latest.yml.blockmap` (Crucial for differential updates)
6.  Click **Publish release**.

#### Option B: Automatic Publish (Advanced & Recommended)
We have automated this process with a script.

**1. Generate a GitHub Token (One-time setup)**
1.  Go to **GitHub Settings** > **Developer settings** > **Personal access tokens** > **Tokens (classic)**.
2.  Click **Generate new token (classic)**.
3.  **Note**: "Electron Auto-Publish".
4.  **Scopes**: Select `repo` (Full control of private repositories) or `public_repo` (if open source).
5.  Click **Generate token** and **COPY IT** immediately.

**2. Run the Publish Script**
1.  Open PowerShell in `SourceCode/Angular`.
2.  Run:
    ```powershell
    .\publish-release.ps1
    ```
    ``` ghkey
    YOUR_GITHUB_TOKEN_HERE
    ```
3.  The script will:
    *   Ask for your **GitHub Token** (paste the one you copied).
    *   Build the Angular app.
    *   Build the .NET API.
    *   Package the Electron app.
    *   **Automatically upload** the release to GitHub.

**Note**: You only need to paste the token once per PowerShell session. For permanent setup, you can add `GH_TOKEN` to your System Environment Variables.

---

## Database Migrations Strategy
You do **not** need to manually update the database on client machines.
-   **Mechanism**: The .NET API is configured to run Migrations on startup.
-   **Code**: `SourceCode/SQLAPI/POS.API/Program.cs` contains:
    ```csharp
    using (var serviceScope = app.Services...CreateScope()) {
        var context = serviceScope...GetRequiredService<POSDbContext>();
        context.Database.Migrate(); // <--- Applies pending migrations
    }
    ```
-   **Workflow**:
    1.  You make changes to the Entity Framework models in your dev environment.
    2.  You run `dotnet ef migrations add NewFeature` to create the migration files.
    3.  You build the Electron app. The new migration DLLs are included.
    4.  When the user updates and runs the app, `Database.Migrate()` detects the pending migration and applies it to their local `POSDb.db`.

## Testing the Update
1.  Build version `1.0.0` and install it.
2.  Increment version to `1.0.1` in `package.json`.
3.  Build `1.0.1`.
4.  Create a Release on GitHub for `v1.0.1` and upload the files.
5.  Run the installed `1.0.0` app.
6.  Watch `C:\Users\<User>\AppData\Roaming\POSApp\api-debug.log` (or console if dev) for "Update available".
7.  Wait for the prompt and click "Restart Now".
