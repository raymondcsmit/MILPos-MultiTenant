# Build Desktop Version
param(
    [string]$Version = "1.0.0",
    [string]$Configuration = "Release"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Building Desktop Application v$Version" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"
$SourceRoot = $PSScriptRoot

try {
    # Step 1: Build Angular with Desktop configuration
    Write-Host "[1/4] Building Angular Frontend (Desktop)..." -ForegroundColor Green
    Set-Location "$SourceRoot\..\..\Angular"
    
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force "dist"
    }
    
    npm install
    npm run build -- --configuration production
    
    Write-Host "  ✓ Angular build complete" -ForegroundColor Green
    Write-Host ""

    # Step 2: Build API with Desktop configuration
    Write-Host "[2/4] Building API (Desktop mode)..." -ForegroundColor Green
    Set-Location "$SourceRoot"
    
    $env:ASPNETCORE_ENVIRONMENT = "Desktop"
    
    dotnet publish POS.API\POS.API.csproj `
        -c $Configuration `
        -r win-x64 `
        --self-contained true `
        -p:PublishSingleFile=false `
        -p:EnvironmentName=Desktop `
        -o "publish\desktop\api"
    
    Write-Host "  ✓ API build complete" -ForegroundColor Green
    Write-Host ""

    # Step 3: Copy Angular dist to API publish folder
    Write-Host "[3/4] Packaging application..." -ForegroundColor Green
    
    $AngularDist = "$SourceRoot\..\..\Angular\dist"
    $ApiPublish = "$SourceRoot\publish\desktop\api"
    $WwwRoot = "$ApiPublish\wwwroot"
    
    if (Test-Path $WwwRoot) {
        Remove-Item -Recurse -Force $WwwRoot
    }
    
    New-Item -ItemType Directory -Force -Path $WwwRoot | Out-Null
    Copy-Item -Path "$AngularDist\*" -Destination $WwwRoot -Recurse -Force
    
    # Copy Desktop-specific appsettings
    Copy-Item -Path "POS.API\appsettings.Desktop.json" -Destination "$ApiPublish\appsettings.json" -Force
    
    Write-Host "  ✓ Packaging complete" -ForegroundColor Green
    Write-Host ""

    # Step 4: Create version info
    Write-Host "[4/4] Creating version info..." -ForegroundColor Green
    
    $versionInfo = @{
        Version = $Version
        BuildDate = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        DeploymentMode = "Desktop"
        DatabaseProvider = "Sqlite"
    } | ConvertTo-Json
    
    $versionInfo | Out-File -FilePath "$ApiPublish\version.json" -Encoding UTF8
    
    Write-Host "  ✓ Version info created" -ForegroundColor Green
    Write-Host ""

    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Desktop build complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Output location: $ApiPublish" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To run the desktop application:" -ForegroundColor Cyan
    Write-Host "  cd $ApiPublish" -ForegroundColor White
    Write-Host "  .\POS.API.exe" -ForegroundColor White
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Build failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    exit 1
}
finally {
    Set-Location $SourceRoot
}
