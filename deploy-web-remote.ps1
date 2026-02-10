# deploy-web-remote.ps1
# Automates Build and Deployment to a Remote Windows Server
# PREREQUISITE: The Remote Server must have WinRM enabled (Run 'Enable-PSRemoting' on server)

# --- Configuration ---
$ServerIP = "62.171.140.251"
$Username = "Administrator"
$Password = "ZamaKhpalUNAZPOS" # WARNING: Storing passwords in plain text is not secure. Use with caution.
$RemotePath = "C:\inetpub\wwwroot\pos-app" # Adjust this to your actual IIS folder
$AppPoolName = "POS-Pool" # CHANGE THIS to your actual IIS Application Pool name
$LocalPublishDir = ".\Publish\Web"

# --- Build Steps ---
Write-Host "1. Building Application Locally..." -ForegroundColor Cyan

# 0. Prerequisites Check
Write-Host "Checking Pre-requisites..." -ForegroundColor Cyan

# Check if WSMan provider is loaded (simple check)
if (-not (Get-PSProvider -PSProvider WSMan -ErrorAction SilentlyContinue)) {
    Import-Module Microsoft.WSMan.Management -ErrorAction SilentlyContinue
}

# Warn if TrustedHosts might not be set (Soft Check)
try {
    if (Test-Path WSMan:\localhost\Client\TrustedHosts) {
        $trusted = (Get-Item WSMan:\localhost\Client\TrustedHosts).Value
        if ($trusted -notlike "*$ServerIP*") {
             Write-Host "WARNING: Server IP $ServerIP is not in TrustedHosts." -ForegroundColor Yellow
             Write-Host "Please run '.\setup-winrm.ps1' as Administrator first." -ForegroundColor Yellow
             # We don't exit, we try anyway, just in case manual config worked
        }
    }
} catch {}

# 1. Clean
if (Test-Path $LocalPublishDir) { Remove-Item -Recurse -Force $LocalPublishDir }
New-Item -ItemType Directory -Force -Path $LocalPublishDir | Out-Null

# 2. Angular Build
Write-Host "   - Building Angular..." -ForegroundColor Green
Set-Location ".\SourceCode\Angular"
npm install
# Use npx to avoid 'npm run' argument passing issues and ensure local ng is used
npx ng build --configuration=production
Set-Location ..\..

# 3. .NET API Build
Write-Host "   - Publishing .NET API..." -ForegroundColor Green
dotnet publish ".\SourceCode\SQLAPI\POS.API\POS.API.csproj" -c Release -o $LocalPublishDir /p:EnvironmentName=Cloud
if ($LASTEXITCODE -ne 0) { Write-Error "API Build Failed"; exit }

# 4. Copy Angular
Write-Host "   - Merging Angular build..." -ForegroundColor Green
# Match Server Structure: ClientApp/browser
$targetDir = "$LocalPublishDir\ClientApp\browser"
if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Force -Path $targetDir | Out-Null }

# Check for 'browser' folder (Angular 17+ esbuild) or flat structure
$angularOutputPath = ".\SourceCode\SQLAPI\POS.API\ClientApp"
if (Test-Path "$angularOutputPath\browser") {
    $angularOutputPath = "$angularOutputPath\browser"
}

if (Test-Path $angularOutputPath) {
    Copy-Item -Recurse "$angularOutputPath\*" $targetDir
} else {
    Write-Error "Angular build output not found at $angularOutputPath"
    exit
}

# --- Deployment Steps ---
Write-Host "2. Deploying to Remote Server ($ServerIP)..." -ForegroundColor Cyan

# Create Session
$securePassword = ConvertTo-SecureString $Password -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential ($Username, $securePassword)

try {
    Write-Host "   - Connecting to server..." -ForegroundColor Yellow
    $session = New-PSSession -ComputerName $ServerIP -Credential $cred -SessionOption (New-PSSessionOption -SkipCACheck -SkipCNCheck)
    
    # Stop IIS Site to release file locks
    Invoke-Command -Session $session -ArgumentList $AppPoolName -ScriptBlock { 
        param($name)
        try { Stop-WebAppPool -Name $name -ErrorAction SilentlyContinue } catch {}
    }

    Write-Host "   - Copying files (This may take a while)..." -ForegroundColor Yellow
    # Ensure remote directory exists
    Invoke-Command -Session $session -ArgumentList $RemotePath -ScriptBlock { 
        param($path) 
        if (-not (Test-Path $path)) { New-Item -ItemType Directory -Force -Path $path }
    }

    # Copy Files
    Copy-Item -Path "$LocalPublishDir\*" -Destination $RemotePath -ToSession $session -Recurse -Force

    # Restart IIS
    Invoke-Command -Session $session -ArgumentList $AppPoolName -ScriptBlock { 
        param($name)
        try { Start-WebAppPool -Name $name -ErrorAction SilentlyContinue } catch {}
    }
    
    Write-Host "----------------------------------------" -ForegroundColor Green
    Write-Host "DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "----------------------------------------" -ForegroundColor Green

} catch {
    Write-Host "DEPLOYMENT FAILED: $_" -ForegroundColor Red
    Write-Host "Tip: Ensure WinRM is enabled on the server and you have trusted the host locally." -ForegroundColor Gray
    Write-Host "Run on Client: Set-Item WSMan:\localhost\Client\TrustedHosts -Value '$ServerIP' -Concatenate -Force" -ForegroundColor Gray
} finally {
    if ($session) { Remove-PSSession $session }
}
