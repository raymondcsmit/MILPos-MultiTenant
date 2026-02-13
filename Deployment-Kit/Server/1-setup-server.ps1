# -------------------------------------------------------------------------
# RUN THIS SCRIPT ON THE REMOTE SERVER (AS ADMINISTRATOR)
# -------------------------------------------------------------------------
# This script configures:
# 1. Installs IIS, .NET Hosting Bundle, and PostgreSQL.
# 2. WinRM (Windows Remote Management) to allow remote deployment.
# 3. Windows Firewall to allow incoming deployment connections.
# 4. IIS Website and Application Pool for the POS application.
# -------------------------------------------------------------------------

# --- Configuration ---
$AppPoolName = "POS-Pool"
$SiteName = "POS-App"
$SitePath = "C:\inetpub\wwwroot\pos-app"
$SitePort = 80
$DownloadDir = "C:\TempDownloads"

Write-Host "Starting Remote Deployment Configuration..." -ForegroundColor Cyan

# --- Step 0: Install Prerequisites (IIS, .NET, PostgreSQL) ---
Write-Host "0. Checking and Installing Prerequisites..." -ForegroundColor Yellow

# Ensure Download Directory Exists
if (-not (Test-Path $DownloadDir)) { New-Item -ItemType Directory -Force -Path $DownloadDir | Out-Null }

# 0.1 Install IIS (Web-Server)
Write-Host "   - Checking IIS Installation..." -ForegroundColor Gray
$iisInstalled = Get-WindowsFeature Web-Server
if (-not $iisInstalled.Installed) {
    Write-Host "   - Installing IIS..." -ForegroundColor Yellow
    Install-WindowsFeature -Name Web-Server -IncludeManagementTools -IncludeAllSubFeature
    Write-Host "   - IIS Installed." -ForegroundColor Green
} else {
    Write-Host "   - IIS is already installed." -ForegroundColor Gray
}

# 0.2 Install .NET Core Hosting Bundle
# Attempt to check if DotNet is installed or just force install the bundle
Write-Host "   - Checking .NET Hosting Bundle..." -ForegroundColor Gray
$dotnetInstallerPath = "$DownloadDir\dotnet-hosting-win.exe"
# Note: In 2026, .NET 10 is assumed to be the target. Adjust URL if needed.
# Using a generic "latest" link pattern or specific version if known.
# Since .NET 10 is not out at the time of writing this script (early 2025), we use a placeholder link or latest stable.
# User requested .NET 10 specifically.
$dotnetUrl = "https://aka.ms/dotnetcore-10-windowshosting" 

try {
    if (-not (Test-Path $dotnetInstallerPath)) {
        Write-Host "   - Downloading .NET Hosting Bundle..." -ForegroundColor Yellow
        # Using -UseBasicParsing for compatibility
        Invoke-WebRequest -Uri $dotnetUrl -OutFile $dotnetInstallerPath -UseBasicParsing
    }
    
    Write-Host "   - Installing .NET Hosting Bundle (Silent)..." -ForegroundColor Yellow
    Start-Process -FilePath $dotnetInstallerPath -ArgumentList "/install", "/quiet", "/norestart" -Wait
    Write-Host "   - .NET Hosting Bundle Installed." -ForegroundColor Green
} catch {
    Write-Host "   - WARNING: Failed to download/install .NET Bundle. Please install manually." -ForegroundColor Red
    Write-Host "   - Error: $_" -ForegroundColor Red
}

# 0.3 Install PostgreSQL
Write-Host "   - Checking PostgreSQL..." -ForegroundColor Gray
# Check if Postgres service exists
if (-not (Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue)) {
    Write-Host "   - Downloading PostgreSQL Installer..." -ForegroundColor Yellow
    $pgInstallerPath = "$DownloadDir\postgresql-installer.exe"
    # URL for PostgreSQL 17 (Estimated Stable for 2026)
    $pgUrl = "https://get.enterprisedb.com/postgresql/postgresql-17.0-1-windows-x64.exe" 
    
    try {
        if (-not (Test-Path $pgInstallerPath)) {
             Invoke-WebRequest -Uri $pgUrl -OutFile $pgInstallerPath -UseBasicParsing
        }

        Write-Host "   - Installing PostgreSQL (Silent - Default Password: 'root')..." -ForegroundColor Yellow
        # Unattended install arguments
        # --superpassword "root" -> Sets 'postgres' user password to 'root'
        Start-Process -FilePath $pgInstallerPath -ArgumentList "--mode unattended", "--superpassword root", "--servicepassword root" -Wait
        Write-Host "   - PostgreSQL Installed." -ForegroundColor Green
    } catch {
        Write-Host "   - WARNING: Failed to download/install PostgreSQL. Please install manually." -ForegroundColor Red
        Write-Host "   - Error: $_" -ForegroundColor Red
    }
} else {
    Write-Host "   - PostgreSQL Service found. Skipping installation." -ForegroundColor Gray
}

# --- Step 1: Configure WinRM (Remote Access) ---
Write-Host "1. Configuring WinRM for Remote Deployment..." -ForegroundColor Yellow

# Stop WinRM to release locks
Stop-Service WinRM -Force -ErrorAction SilentlyContinue

# --- Clean Up "Ghost" Configurations (Deep Clean) ---
Write-Host "   - Cleaning up HTTP reservations..." -ForegroundColor Cyan
netsh http delete urlacl url=http://+:5985/wsman/ 2>$null
netsh http delete urlacl url=http://+:5986/wsman/ 2>$null
netsh http delete urlacl url=http://+:8888/wsman/ 2>$null

# Start Service
Start-Service WinRM

# --- Configure on Port 8888 ---
$WinRMPort = 8888
Write-Host "   - Configuring WinRM to listen on Port $WinRMPort..." -ForegroundColor Yellow

# 1. Remove All Listeners (PowerShell Way - Force)
Get-ChildItem WSMan:\localhost\Listener | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# 2. Create Fresh Listener on 8888
New-Item -Path WSMan:\localhost\Listener -Transport HTTP -Address * -Port $WinRMPort -Force

# 3. Verify
$check = Get-ChildItem WSMan:\localhost\Listener
if ($check) {
    Write-Host "   - SUCCESS: Listener is active on Port $($check.Item('Port').Value)." -ForegroundColor Green
} else {
    Write-Host "   - ERROR: Failed to create listener." -ForegroundColor Red
}

# Allow Unencrypted traffic
Set-Item WSMan:\localhost\Service\AllowUnencrypted -Value $true -Force
Set-Item WSMan:\localhost\Service\Auth\Basic -Value $true -Force

# Open Firewall
$fwRuleName = "WinRM Custom Port $WinRMPort"
Remove-NetFirewallRule -DisplayName $fwRuleName -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName $fwRuleName -Direction Inbound -LocalPort $WinRMPort -Protocol TCP -Action Allow -Profile Any
Write-Host "   - Firewall rule created/refreshed for Port $WinRMPort." -ForegroundColor Green

# Restart WinRM Service
Restart-Service WinRM


# --- Step 2: Configure IIS (Hosting) ---
Write-Host "2. Configuring IIS Website and AppPool..." -ForegroundColor Yellow

# Import IIS Module
Import-Module WebAdministration

# 2.1 Create Directory
if (-not (Test-Path $SitePath)) {
    New-Item -ItemType Directory -Force -Path $SitePath | Out-Null
    Write-Host "   - Created directory: $SitePath" -ForegroundColor Gray
}

# 2.2 Create Application Pool
if (-not (Test-Path "IIS:\AppPools\$AppPoolName")) {
    New-WebAppPool -Name $AppPoolName
    # Set to 'No Managed Code' because .NET Core runs in Kestrel behind IIS
    Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name "managedRuntimeVersion" -Value "" 
    Write-Host "   - AppPool '$AppPoolName' created." -ForegroundColor Green
} else {
    Write-Host "   - AppPool '$AppPoolName' already exists." -ForegroundColor Gray
}

# 2.3 Create Website
if (-not (Test-Path "IIS:\Sites\$SiteName")) {
    # Optional: Stop 'Default Web Site' if it's using port 80
    if (Test-Path "IIS:\Sites\Default Web Site") {
        $defaultSite = Get-Item "IIS:\Sites\Default Web Site"
        if ($defaultSite.state -eq "Started") {
            Stop-Website -Name "Default Web Site"
            Write-Host "   - Stopped 'Default Web Site' to free up Port $SitePort." -ForegroundColor Gray
        }
    }

    New-Website -Name $SiteName -Port $SitePort -PhysicalPath $SitePath -ApplicationPool $AppPoolName -Force
    Write-Host "   - Website '$SiteName' created on Port $SitePort." -ForegroundColor Green
} else {
    Write-Host "   - Website '$SiteName' already exists." -ForegroundColor Gray
}

Write-Host "------------------------------------------------"
Write-Host "Configuration Complete!" -ForegroundColor Cyan
Write-Host "You can now run 'publish-web.ps1' from your local machine." -ForegroundColor Cyan
