# build-only.ps1
# Automates Build and Zipping for Manual Deployment
# Use this when WinRM (Remote Deployment) is blocked by firewalls.

# --- Configuration ---
$publishDir = ".\Publish\Web"
$apiProject = ".\SourceCode\SQLAPI\POS.API\POS.API.csproj"
$angularDir = ".\SourceCode\Angular"

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
# Use Angular CLI directly with explicit configuration and project
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
    Copy-Item -Recurse $clientAppBrowser $targetDir -Force
} else {
    Write-Host "ClientApp browser output not found at $clientAppBrowser" -ForegroundColor Yellow
    exit
}

# --- 5. Database Migration Script Generation ---
Write-Host "Generating Migration Script..." -ForegroundColor Green
dotnet ef migrations script --output "$publishDir\deploy.sql" --project ".\SourceCode\SQLAPI\POS.Migrations.PostgreSQL\POS.Migrations.PostgreSQL.csproj" --startup-project ".\SourceCode\SQLAPI\POS.API\POS.API.csproj" -- --DatabaseProvider=PostgreSql

# --- 6. Zip for Manual Deployment ---
Write-Host "Compressing artifacts for Manual Deployment..." -ForegroundColor Yellow
$zipFile = "$PWD\publish.zip"
if (Test-Path $zipFile) { Remove-Item $zipFile }
Compress-Archive -Path "$publishDir\*" -DestinationPath $zipFile -Force

Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host "BUILD SUCCESSFUL!" -ForegroundColor Green
Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host "1. Copy this file to your remote server: $zipFile" -ForegroundColor Yellow
Write-Host "2. Unzip it to C:\inetpub\wwwroot\pos-app" -ForegroundColor Yellow
Write-Host "3. Run the SQL script: $publishDir\deploy.sql" -ForegroundColor Yellow
