# setup-winrm.ps1
# Run this ONCE as Administrator to configure your machine for remote deployment

Write-Host "Configuring Local WinRM..." -ForegroundColor Cyan

# 1. Start WinRM Service
Write-Host "1. Starting WinRM Service..."
Start-Service WinRM -ErrorAction SilentlyContinue

# 2. Configure WinRM for Remoting
Write-Host "2. Enabling PowerShell Remoting..."
Enable-PSRemoting -Force -ErrorAction SilentlyContinue
# Sometimes Enable-PSRemoting fails if network is Public, so we try winrm quickconfig too
cmd /c "winrm quickconfig -q" | Out-Null

# 3. Load Provider & Connect
Write-Host "3. Connecting to WSMan..."
if (-not (Get-PSProvider -PSProvider WSMan -ErrorAction SilentlyContinue)) { 
    Import-Module Microsoft.WSMan.Management -ErrorAction SilentlyContinue 
}
if (-not (Test-Path WSMan:\localhost)) { 
    Connect-WSMan -ErrorAction SilentlyContinue 
}

# 4. Set TrustedHosts
$ServerIP = "208.110.72.211"
Write-Host "4. Setting TrustedHosts for $ServerIP..."
try {
    # Check if drive exists now
    if (Test-Path WSMan:\localhost\Client\TrustedHosts) {
        $current = Get-Item WSMan:\localhost\Client\TrustedHosts
        if ($current.Value -notlike "*$ServerIP*") {
            Set-Item WSMan:\localhost\Client\TrustedHosts -Value "$ServerIP" -Concatenate -Force
            Write-Host "   > Success: Added $ServerIP to TrustedHosts" -ForegroundColor Green
        } else {
            Write-Host "   > Skipped: $ServerIP already trusted" -ForegroundColor Green
        }
        
        Set-Item WSMan:\localhost\Client\AllowUnencrypted -Value $true -Force
        Write-Host "   > Success: Allowed Unencrypted traffic" -ForegroundColor Green
    } else {
        throw "WSMan drive not found"
    }
} catch {
    Write-Host "   ! PowerShell Method Failed: $_" -ForegroundColor Yellow
    Write-Host "   > Trying fallback 'winrm' command..."
    cmd /c "winrm set winrm/config/client @{TrustedHosts=`"$ServerIP`"}"
    cmd /c "winrm set winrm/config/client @{AllowUnencrypted=`"true`"}"
}

Write-Host "`nSetup Complete. You can now run deploy-web-remote.ps1" -ForegroundColor Cyan
Pause
