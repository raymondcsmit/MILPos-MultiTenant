# configure_remote_deployment.ps1
# -------------------------------------------------------------------------
# RUN THIS SCRIPT ON THE REMOTE SERVER (AS ADMINISTRATOR)
# -------------------------------------------------------------------------
# This script configures:
# 1. WinRM (Windows Remote Management) to allow remote deployment.
# 2. Windows Firewall to allow incoming deployment connections.
# 3. IIS Website and Application Pool for the POS application.
# -------------------------------------------------------------------------

# --- Configuration ---
$AppPoolName = "POS-Pool"
$SiteName = "POS-App"
$SitePath = "C:\inetpub\wwwroot\pos-app"
$SitePort = 80

Write-Host "Starting Remote Deployment Configuration..." -ForegroundColor Cyan

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
