# Build Cloud Version - ASCII Version
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
    # Step 1: Build Angular
    Write-Host "[1/3] Building Angular Frontend..." -ForegroundColor Green
    $AngularPath = Join-Path $SourceRoot "..\Angular"
    Push-Location $AngularPath
    
    if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
    
    npm install
    npx ng build --configuration production
    if ($LASTEXITCODE -ne 0) { 
        Pop-Location
        throw "Angular build failed" 
    }
    
    Pop-Location
    Write-Host "Done: Angular build complete" -ForegroundColor Green
    Write-Host ""

    # Step 2: Build API
    Write-Host "[2/3] Building API - Cloud mode..." -ForegroundColor Green
    Set-Location $SourceRoot
    
    [System.Environment]::SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Cloud")
    
    $ProjFile = Join-Path $SourceRoot "POS.API\POS.API.csproj"
    $OutputDir = Join-Path $SourceRoot "publish\cloud\api"
    
    dotnet publish $ProjFile -c $Configuration -o $OutputDir -p:EnvironmentName=Cloud
    if ($LASTEXITCODE -ne 0) { throw "API publish failed" }
    
    # Copy Cloud-specific appsettings
    $CloudSettings = Join-Path $SourceRoot "POS.API\appsettings.Cloud.json"
    $TargetSettings = Join-Path $OutputDir "appsettings.json"
    Copy-Item -Path $CloudSettings -Destination $TargetSettings -Force
    
    Write-Host "Done: API build complete" -ForegroundColor Green
    Write-Host ""

    # Step 3: Packaging
    Write-Host "[3/3] Packaging Angular for Static hosting..." -ForegroundColor Green
    
    $AngularDist = Join-Path $SourceRoot "POS.API\ClientApp"
    $CloudAngular = Join-Path $SourceRoot "publish\cloud\angular"
    
    if (Test-Path $CloudAngular) { Remove-Item -Recurse -Force $CloudAngular }
    New-Item -ItemType Directory -Force -Path $CloudAngular | Out-Null
    
    if (Test-Path $AngularDist) {
        Copy-Item -Path "$AngularDist\*" -Destination $CloudAngular -Recurse -Force
    } else {
        throw "Angular dist not found at $AngularDist"
    }
    
    Write-Host "Done: Angular packaged for static hosting" -ForegroundColor Green
    Write-Host ""

    # Deployment info
    $deployFile = Join-Path $SourceRoot "publish\cloud\deployment-info.json"
    $deploymentInfo = @{
        Version = $Version
        BuildDate = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        DeploymentMode = "Cloud"
        DatabaseProvider = "SqlServer"
    } | ConvertTo-Json
    
    $deploymentInfo | Out-File -FilePath $deployFile -Encoding ASCII

    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Cloud build complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Build failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.InvocationInfo) {
        Write-Host "Location: $($_.InvocationInfo.ScriptName) at line $($_.InvocationInfo.ScriptLineNumber)" -ForegroundColor Yellow
    }
    Write-Host ""
    exit 1
}
finally {
    Set-Location $SourceRoot
}
