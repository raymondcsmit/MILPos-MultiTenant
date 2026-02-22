# Remote Web Deployment Script Documentation

## Overview
This document explains the structure and usage of the PowerShell deployment script used to automate the build and deployment process of a .NET Core API and Angular frontend application to a remote Windows Server running IIS.

The script performs the following main tasks:
1.  Builds the Angular application.
2.  Publishes the .NET Core API.
3.  Combines the artifacts.
4.  Generates database migration scripts.
5.  Deploys the artifacts to a remote server using PowerShell Remoting (WinRM).

## Prerequisites

### Local Machine (Build Agent)
*   **PowerShell 5.1 or Core**
*   **.NET SDK** (matching the project version)
*   **Node.js & npm** (for Angular build)
*   **WinRM Configuration**: The remote server's IP must be added to the `TrustedHosts` list.
    ```powershell
    Set-Item WSMan:\localhost\Client\TrustedHosts -Value 'REMOTE_SERVER_IP' -Concatenate -Force
    ```

### Remote Server (Target)
*   **Windows Server with IIS** installed.
*   **ASP.NET Core Hosting Bundle** installed.
*   **WinRM (Windows Remote Management)** enabled and configured to accept connections.
*   **Folder Permissions**: The deployment user must have Read/Write access to the target IIS folder.

## Configuration Variables

The script uses the following variables at the top for configuration. You typically need to modify these for different environments or applications.

| Variable | Description | Example |
| :--- | :--- | :--- |
| `$ServerIP` | The IP address of the remote IIS server. | `"208.110.72.211"` |
| `$ServerPort` | The WinRM port (default is 5985, custom is often used). | `8888` |
| `$Username` | The administrative user on the remote server. | `"administrator"` |
| `$Password` | The password for the remote user. | `"MyPa$$w0rd"` |
| `$RemotePath` | The physical path on the remote server where the app lives. | `"C:\inetpub\wwwroot\pos-app"` |
| `$AppPoolName` | The name of the IIS Application Pool to restart. | `"POS-Pool"` |
| `$publishDir` | Local temporary directory for build artifacts. | `".\Publish\Web"` |
| `$apiProject` | Path to the .NET API `.csproj` file. | `".\SourceCode\...\API.csproj"` |
| `$angularDir` | Path to the Angular project root. | `".\SourceCode\Angular"` |

## Workflow Steps

### 1. Prerequisites Check
The script checks if the `WSMan` provider is loaded and warns if the target `$ServerIP` is not in the local `TrustedHosts` list.

### 2. Clean Previous Publish
Removes the local `$publishDir` to ensure a clean build.

### 3. Build Angular App
*   Navigates to `$angularDir`.
*   Runs `npm install` to restore dependencies.
*   Runs `npx ng build --configuration=production` to build the frontend.

### 4. Publish .NET API
*   Runs `dotnet publish` in Release mode.
*   Output is directed to `$publishDir`.

### 5. Copy Angular Build
*   Copies the compiled Angular files (from `dist` or `browser` folder) into the .NET publish directory (specifically `ClientApp/browser` or `wwwroot` depending on configuration).
*   This ensures the API can serve the SPA or the SPA is in the correct place for IIS.

### 6. Generate Migration Script
*   Runs `dotnet ef migrations script` to generate a SQL file (`deploy.sql`) for database updates.
*   This file is included in the publish package but **not automatically executed** on the server (usually manually run by a DBA or a separate step).

### 7. Remote Deployment
The script establishes a `PSSession` with the remote server and performs the following:
1.  **Stop AppPool**: Stops the IIS Application Pool to release file locks.
2.  **Compress**: Zips the local `$publishDir` into `publish.zip`.
3.  **Upload**: Copies `publish.zip` to the remote server.
4.  **Extract**: Unzips the file on the remote server, overwriting existing files.
5.  **Restart AppPool**: Starts the IIS Application Pool to bring the site back online.

## Troubleshooting

*   **WinRM Connection Failed**: Ensure the firewall on the remote server allows inbound traffic on the configured port (e.g., 8888 or 5985). Check `TrustedHosts` on your local machine.
*   **File in Use / Access Denied**: If the script fails to remove files remotely, it often means the AppPool didn't stop in time. The script attempts to stop it, but manual intervention might be needed if it hangs.
*   **Build Errors**: Run the `npm build` or `dotnet publish` commands manually to see detailed error messages.

## Security Note
Storing passwords in plain text in the script (as seen in the example) is **not recommended** for production environments. Consider using:
*   PowerShell SecretManagement module.
*   Prompting for credentials at runtime (`Get-Credential`).
*   CI/CD pipeline secrets variables.
