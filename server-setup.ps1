# server-setup.ps1
# RUN THIS SCRIPT ON THE SERVER (As Administrator)

# 1. Download & Install .NET 10.0 Hosting Bundle
Write-Host "1. Opening Download Page for .NET 10.0 Hosting Bundle..." -ForegroundColor Yellow
# This will open the browser. Please download and install "Hosting Bundle" manually.
Start-Process "https://dotnet.microsoft.com/en-us/download/dotnet/10.0" 

Write-Host "   > ACTION REQUIRED: Please download and run the 'Hosting Bundle' installer from the opened page." -ForegroundColor Red
Write-Host "   > After installation is complete, press Enter to continue..." -ForegroundColor Yellow
Pause

# 2. Grant Permissions to AppPool Identity
$webPath = "C:\inetpub\wwwroot\pos-app"
$appPoolUser = "IIS AppPool\POS-Pool"

Write-Host "2. Granting Permissions for '$appPoolUser' on '$webPath'..." -ForegroundColor Yellow
if (Test-Path $webPath) {
    try {
        $acl = Get-Acl $webPath
        $permission = "$appPoolUser","ReadAndExecute","Allow"
        $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
        $acl.SetAccessRule($accessRule)
        Set-Acl $webPath $acl
        Write-Host "   > Permissions Granted." -ForegroundColor Green
    } catch {
        Write-Host "   ! Error Setting Permissions: $_" -ForegroundColor Red
        Write-Host "   > Try running this script as Administrator." -ForegroundColor Yellow
    }
} else {
    Write-Host "   ! Path not found: $webPath" -ForegroundColor Red
}

# 3. Restart IIS
Write-Host "3. Restarting IIS..." -ForegroundColor Yellow
iisreset

Write-Host "--- DONE! Please check your website now. ---" -ForegroundColor Cyan
Pause
