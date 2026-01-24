# Build Cloud Version
param(
    [string]$Version = "1.0.0",
    [string]$Configuration = "Release"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Building Cloud Deployment v$Version" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"
$SourceRoot = $PSScriptRoot

try {
    # Step 1: Build Angular for Cloud (production)
    Write-Host "[1/3] Building Angular Frontend (Cloud)..." -ForegroundColor Green
    Set-Location "$SourceRoot\..\..\Angular"
    
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force "dist"
    }
    
    npm install
    npm run build -- --configuration production
    
    Write-Host "  ✓ Angular build complete" -ForegroundColor Green
    Write-Host ""

    # Step 2: Build API for Cloud deployment
    Write-Host "[2/3] Building API (Cloud mode)..." -ForegroundColor Green
    Set-Location "$SourceRoot"
    
    $env:ASPNETCORE_ENVIRONMENT = "Cloud"
    
    dotnet publish POS.API\POS.API.csproj `
        -c $Configuration `
        -o "publish\cloud\api" `
        -p:EnvironmentName=Cloud
    
    # Copy Cloud-specific appsettings
    Copy-Item -Path "POS.API\appsettings.Cloud.json" -Destination "publish\cloud\api\appsettings.json" -Force
    
    Write-Host "  ✓ API build complete" -ForegroundColor Green
    Write-Host ""

    # Step 3: Package Angular for separate hosting
    Write-Host "[3/3] Packaging Angular for CDN/Static hosting..." -ForegroundColor Green
    
    $AngularDist = "$SourceRoot\..\..\Angular\dist"
    $CloudAngular = "$SourceRoot\publish\cloud\angular"
    
    if (Test-Path $CloudAngular) {
        Remove-Item -Recurse -Force $CloudAngular
    }
    
    New-Item -ItemType Directory -Force -Path $CloudAngular | Out-Null
    Copy-Item -Path "$AngularDist\*" -Destination $CloudAngular -Recurse -Force
    
    Write-Host "  ✓ Angular packaged for static hosting" -ForegroundColor Green
    Write-Host ""

    # Create deployment info
    $deploymentInfo = @{
        Version = $Version
        BuildDate = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        DeploymentMode = "Cloud"
        DatabaseProvider = "SqlServer"
        ApiPath = "publish\cloud\api"
        AngularPath = "publish\cloud\angular"
    } | ConvertTo-Json
    
    $deploymentInfo | Out-File -FilePath "$SourceRoot\publish\cloud\deployment-info.json" -Encoding UTF8

    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Cloud build complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "API Output: $SourceRoot\publish\cloud\api" -ForegroundColor Yellow
    Write-Host "Angular Output: $SourceRoot\publish\cloud\angular" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Deploy API to Azure App Service / IIS" -ForegroundColor White
    Write-Host "  2. Deploy Angular to Azure Storage / CDN" -ForegroundColor White
    Write-Host "  3. Update connection strings in production" -ForegroundColor White
    Write-Host "  4. Configure CORS origins in appsettings.json" -ForegroundColor White
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
