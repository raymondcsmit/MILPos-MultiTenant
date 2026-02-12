# deploy-web-remote.ps1
# Automates Build and Deployment to a Remote Windows Server
# Combines local build improvements with remote deployment capabilities

# --- Configuration ---
$ServerIP = "62.171.140.251"
$Username = "Administrator"
$Password = "ZamaKhpalUNAZPOS" # WARNING: Storing passwords in plain text is not secure.
$RemotePath = "C:\inetpub\wwwroot\pos-app" # Adjust this to your actual IIS folder
$AppPoolName = "POS-Pool" # CHANGE THIS to your actual IIS Application Pool name
$publishDir = ".\Publish\Web"
$apiProject = ".\SourceCode\SQLAPI\POS.API\POS.API.csproj"
$angularDir = ".\SourceCode\Angular"

# --- 0. Prerequisites Check ---
Write-Host "Checking Pre-requisites..." -ForegroundColor Cyan

# Check if WSMan provider is loaded
if (-not (Get-PSProvider -PSProvider WSMan -ErrorAction SilentlyContinue)) {
    Import-Module Microsoft.WSMan.Management -ErrorAction SilentlyContinue
}

# Warn if TrustedHosts might not be set
try {
    if (Test-Path WSMan:\localhost\Client\TrustedHosts) {
        $trusted = (Get-Item WSMan:\localhost\Client\TrustedHosts).Value
        if ($trusted -notlike "*$ServerIP*") {
             Write-Host "WARNING: Server IP $ServerIP is not in TrustedHosts." -ForegroundColor Yellow
             Write-Host "Please run '.\setup-winrm.ps1' as Administrator first." -ForegroundColor Yellow
        }
    }
} catch {}

# --- 1. Clean previous publish ---
Write-Host "Cleaning previous publish..." -ForegroundColor Yellow
if (Test-Path $publishDir) {
    Remove-Item -Recurse -Force $publishDir
}
New-Item -ItemType Directory -Force -Path $publishDir | Out-Null

# --- 2. Build Angular App ---
Write-Host "Building Angular Application..." -ForegroundColor Green
Set-Location $angularDir
npm install
# Use Angular CLI directly with explicit configuration and project (From new script)
npx ng build --configuration=production --project=pos
Set-Location ..\..

# --- 3. Publish .NET API ---
Write-Host "Publishing .NET API..." -ForegroundColor Green
dotnet publish $apiProject -c Release -o $publishDir /p:EnvironmentName=Cloud
if ($LASTEXITCODE -ne 0) { Write-Error "API Build Failed"; exit }

# --- 4. Copy Angular Build ---
Write-Host "Copying Angular build..." -ForegroundColor Green

# Target directory matches appsettings.json "SpaRootPath": "ClientApp/browser"
$targetDir = "$publishDir\ClientApp\browser"
if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Force -Path $targetDir | Out-Null }

# Source directory from Angular build output
$clientAppBrowser = ".\SourceCode\SQLAPI\POS.API\ClientApp\browser\*"

if (Test-Path $clientAppBrowser) {
    Copy-Item -Recurse $clientAppBrowser $targetDir
} else {
    Write-Host "ClientApp browser output not found at $clientAppBrowser" -ForegroundColor Yellow
    exit
}

# --- 5. Database Migration Script Generation ---
Write-Host "Generating Migration Script..." -ForegroundColor Green
# (From new script)
dotnet ef migrations script --output "$publishDir\deploy.sql" --project ".\SourceCode\SQLAPI\POS.Migrations.PostgreSQL\POS.Migrations.PostgreSQL.csproj" --startup-project ".\SourceCode\SQLAPI\POS.API\POS.API.csproj" -- --DatabaseProvider=PostgreSql

Write-Host "Build and Artifacts Ready in $publishDir" -ForegroundColor Cyan
Write-Host "Database Script: $publishDir\deploy.sql" -ForegroundColor Cyan

# --- 6. Deploy to Remote Server ---
Write-Host "Deploying to Remote Server ($ServerIP)..." -ForegroundColor Cyan

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
    Copy-Item -Path "$publishDir\*" -Destination $RemotePath -ToSession $session -Recurse -Force

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
