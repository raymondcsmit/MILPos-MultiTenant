# Deployment Configuration
$publishDir = ".\Publish\Web"
$apiProject = ".\SourceCode\SQLAPI\POS.API\POS.API.csproj"
$angularDir = ".\SourceCode\Angular"

# 1. Clean previous publish
Write-Host "Cleaning previous publish..." -ForegroundColor Yellow
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

# 5. Database Migration Script Generation
Write-Host "Generating Migration Script..." -ForegroundColor Green
dotnet ef migrations script --output "$publishDir\deploy.sql" --project ".\SourceCode\SQLAPI\POS.Migrations.PostgreSQL\POS.Migrations.PostgreSQL.csproj" --startup-project ".\SourceCode\SQLAPI\POS.API\POS.API.csproj" -- --DatabaseProvider=PostgreSql

Write-Host "Deployment Artifacts Ready in $publishDir" -ForegroundColor Cyan
Write-Host "Database Script: $publishDir\deploy.sql" -ForegroundColor Cyan
