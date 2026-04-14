# Prompt for Generating a Deployment Script

Use the prompt below to generate a PowerShell deployment script for your new application. Copy and paste this prompt into an AI chat (like ChatGPT or Claude) and fill in the bracketed information `[ ... ]` with your specific details.

---

## **Prompt Template**

**Context:**
I need a PowerShell script to automate the build and deployment of a .NET Core API and Angular frontend application to a remote Windows Server running IIS. I want the script to follow the same structure and logic as a proven reference script I have used before.

**Reference Logic:**
1.  **Configuration**: Define variables for Server IP, Port, Username, Password, Local Paths, Remote Paths, and IIS AppPool Name.
2.  **Prerequisites**: Check if the local machine has the `WSMan` provider loaded and if the target server IP is in `TrustedHosts`. Warn the user if not.
3.  **Clean**: Delete the previous local publish directory to ensure a fresh build.
4.  **Build Angular**: Navigate to the Angular project folder, run `npm install`, and then run `npx ng build --configuration=production --base-href /app/`.
5.  **Publish API**: Run `dotnet publish` for the .NET API project in Release mode, outputting to the local publish directory.
6.  **Combine Artifacts**: Copy the Angular build output (e.g., from `dist/browser`) into the published API's `ClientApp/browser` folder (or `wwwroot` if applicable).
7.  **Generate Migration Script**: Run `dotnet ef migrations script` to generate a SQL file (`deploy.sql`) in the publish directory.
8.  **Remote Deployment**:
    *   Create a `PSSession` to the remote server using the provided credentials.
    *   **Stop** the IIS Application Pool on the remote server to release file locks.
    *   **Compress** the local publish directory into a zip file.
    *   **Upload** the zip file to the remote server.
    *   **Extract** the zip file on the remote server, overwriting existing files.
    *   **Restart** the IIS Application Pool.
    *   Clean up the local and remote zip files.

**Specific Details for My New Application:**

*   **Server IP**: `[Enter Server IP, e.g., 208.110.72.211]`
*   **WinRM Port**: `[Enter Port, e.g., 5985 or 8888]`
*   **Remote IIS Path**: `[Enter Remote Path, e.g., C:\inetpub\wwwroot\my-new-app]`
*   **IIS AppPool Name**: `[Enter AppPool Name, e.g., MyNewAppPool]`
*   **Local API Project Path**: `[Enter Path to .csproj, e.g., .\Source\MyAPI\MyAPI.csproj]`
*   **Local Angular Project Path**: `[Enter Path to Angular root, e.g., .\Source\MyFrontend]`
*   **Angular Build Output Path**: `[Enter where Angular builds to, e.g., dist\my-app\browser]`
*   **Target ClientApp Path**: `[Enter where API expects SPA files, e.g., ClientApp\browser]`
*   **Database Project Path (Optional)**: `[Enter Path to Migrations .csproj if different]`

**Output Requirements:**
*   Provide the complete PowerShell script.
*   Include comments explaining each step.
*   Ensure error handling (try/catch blocks) is used for the remote session and file operations.
*   Use `Write-Host` with colors to indicate progress (Green for success, Yellow for info, Red for errors).

---
