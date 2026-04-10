# Web Deployment Guide (PostgreSQL)

This guide outlines the steps to deploy the POS application to a web server using PostgreSQL.

## 1. Prerequisites
- **Server**: Windows Server (IIS) or Linux (Nginx/Apache) with .NET 8 Runtime installed.
- **Database**: PostgreSQL server running and accessible from the web server.
- **Client**: POS Application source code.

## 2. Configuration
The application is pre-configured for production in `appsettings.Cloud.json`.
- **DatabaseProvider**: `PostgreSql`
- **Connection String**: `Host=62.171.140.251;Port=5432;Database=POSDb;Username=postgres;Password=Admin@123`

## 3. Deployment Script
Use the following PowerShell script to build and publish the application.

### `publish-web.ps1`
Save this script in the root of your repository (same level as `SourceCode`).

```powershell
# Deployment Configuration
$publishDir = ".\Publish\Web"
$apiProject = ".\SourceCode\SQLAPI\POS.API\POS.API.csproj"
$angularDir = ".\SourceCode\Angular"

# 1. Clean previous publish
if (Test-Path $publishDir) {
    Remove-Item -Recurse -Force $publishDir
}
New-Item -ItemType Directory -Force -Path $publishDir

# 2. Build Angular App
Write-Host "Building Angular Application..." -ForegroundColor Green
Set-Location $angularDir
npm install
npm run build -- --configuration production
Set-Location ..\..

# 3. Publish .NET API
Write-Host "Publishing .NET API..." -ForegroundColor Green
dotnet publish $apiProject -c Release -o $publishDir /p:EnvironmentName=Cloud

# 4. Copy Angular Build to wwwroot
Write-Host "Copying Angular build to wwwroot..." -ForegroundColor Green
$wwwrootDir = "$publishDir\wwwroot"
if (-not (Test-Path $wwwrootDir)) {
    New-Item -ItemType Directory -Force -Path $wwwrootDir
}
Copy-Item -Recurse ".\SourceCode\Angular\dist\browser\*" $wwwrootDir

# 5. Database Migration (Optional - Run manually or include here)
# Write-Host "Generating Migration Script..."
# dotnet ef migrations script --output "$publishDir\migration.sql" --project ".\SourceCode\SQLAPI\POS.Migrations.PostgreSQL\POS.Migrations.PostgreSQL.csproj" --startup-project ".\SourceCode\SQLAPI\POS.API\POS.API.csproj" -- --DatabaseProvider=PostgreSql

Write-Host "Deployment Artifacts Ready in $publishDir" -ForegroundColor Cyan
```

## 4. Deploying to Server

### Option A: Manual Copy
1.  Run `.\publish-web.ps1`.
2.  Copy the contents of `.\Publish\Web` to your server (e.g., `C:\inetpub\wwwroot\pos-app`).
3.  Configure IIS to point to this folder.
4.  Ensure the Application Pool is set to **No Managed Code** (handled by Kestrel) or standard .NET CLR depending on hosting model, but normally for .NET Core/8 it is "No Managed Code".

### Option B: Database Setup
1.  Ensure the PostgreSQL database `POSDb` exists on `62.171.140.251`.
2.  Apply migrations. You can generate a SQL script to run on the server:
    ```powershell
    dotnet ef migrations script --project SourceCode\SQLAPI\POS.Migrations.PostgreSQL\POS.Migrations.PostgreSQL.csproj --startup-project SourceCode\SQLAPI\POS.API\POS.API.csproj --output deploy.sql -- --DatabaseProvider=PostgreSql
    ```
3.  Execute `deploy.sql` on your PostgreSQL server using pgAdmin or `psql`.

## 5. Troubleshooting
- **500 Errors (General)**: Check `logs` folder in the deployment directory.
- **HTTP 500.19 Error (0x8007000d)**:
    1.  This confirms **IIS cannot load the `AspNetCoreModuleV2`**. This often happens if the Hosting Bundle was installed **BEFORE** IIS was enabled.
    2.  **Solution**: valuable
        - Go to **Add/Remove Programs** on the server.
        - Find **Microsoft .NET 10.0 Hosting Bundle** (or similar).
        - Right-click and choose **Repair** (or Uninstall/Reinstall).
        - Open CMD as Administrator and run `net stop was /y` then `net start w3svc`.
- **HTTP 500.19 Error (0x8007000d)**:
    1.  This confirms **IIS cannot load the `AspNetCoreModuleV2`**. This often happens if the Hosting Bundle was installed **BEFORE** IIS was enabled.
    2.  **Solution**: Repair the .NET 10.0 Hosting Bundle installation and restart IIS.
- **HTTP 500.30 Error (App Failed to Start)**:
    1.  The app crashed during startup (e.g., config error, missing dependency, database failure).
    2.  **Solution**: 
        - Open Command Prompt on Server.
        - Navigate to folder: `cd C:\inetpub\wwwroot\pos-app`.
        - Run the exe: `.\POS.API.exe`.
        - Read the error message on screen.
- **Database Connection**: Ensure the firewall on `62.171.140.251` allows connections from your web server's IP on port 5432.

## 6. Enabling Remote Access (Optional)
If you need to manage the PostgreSQL database from your local machine (using pgAdmin or DBeaver), you must open the port and configure PostgreSQL.

### Step A: Open Windows Firewall Port
Run this PowerShell command **on the Server (Run as Administrator)**:

```powershell
New-NetFirewallRule -Name 'PostgreSQL' -DisplayName 'PostgreSQL' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 5432
```

### Step B: Configure PostgreSQL
1.  Locate `postgresql.conf` (usually in `C:\Program Files\PostgreSQL\16\data`).
    - Set `listen_addresses = '*'`.
2.  Locate `pg_hba.conf` (same folder).
    - Add this line to the end: `host    all             all             0.0.0.0/0            scram-sha-256`
3.  Restart the PostgreSQL service:
    ```powershell
    ```powershell
    Restart-Service postgresql-x64-16
    ```

### Step C: Troubleshooting Connection "FATAL: no pg_hba.conf entry"
If you see an error like `FATAL: no pg_hba.conf entry for host "Your-IP", user "postgres", database "postgres", no encryption`, it means you missed **Step B2** above.
This line is **mandatory** for remote access:
`host    all             all             0.0.0.0/0            scram-sha-256`

1.  Open `pg_hba.conf` on the server.
2.  Add that line at the VERY END of the file.
3.  Restart the PostgreSQL service.

## 7. Automated Deployment (One-Click Script)
To use the `deploy-web-remote.ps1` script to deploy from your local machine to the server, you must enable **WinRM** on the server.

### Step A: Enable WinRM on Server
Run this PowerShell command **on the Server (Run as Administrator)**:
```powershell
Enable-PSRemoting -Force
# Allow unencrypted traffic if not using HTTPS (Use with caution or configure SSL)
Set-Item WSMan:\localhost\Service\AllowUnencrypted -Value $true

# Open Firewall for WinRM (HTTP Port 5985)
New-NetFirewallRule -Name 'WinRM-HTTP' -DisplayName 'WinRM (HTTP)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 5985
```

### Step B: Trust Server on Your Local Machine
Run this PowerShell command **on your Local Machine (Run as Administrator)**:
```powershell
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "62.171.140.251" -Concatenate -Force
Set-Item WSMan:\localhost\Client\AllowUnencrypted -Value $true
```

### Step C: Run Deployment
Now you can simply run:
```powershell
.\deploy-web-remote.ps1
```
