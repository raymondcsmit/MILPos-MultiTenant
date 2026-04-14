# Build Desktop Version - ASCII Version
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
    # Step 1: Build Angular
    Write-Host "[1/4] Building Angular Frontend..." -ForegroundColor Green
    $AngularPath = Join-Path $SourceRoot "..\Angular"
    Push-Location $AngularPath
    
    # Clean old build
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
    Write-Host "[2/4] Building API - Desktop mode..." -ForegroundColor Green
    Set-Location $SourceRoot
    
    # Use .NET way for env vars to be safe
    [System.Environment]::SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Desktop")
    
    # Explicit absolute path for project file
    $ProjFile = Join-Path $SourceRoot "POS.API\POS.API.csproj"
    $OutputDir = Join-Path $SourceRoot "publish\desktop\api"
    
    dotnet publish $ProjFile -c $Configuration -r win-x64 --self-contained true -p:PublishSingleFile=false -p:EnvironmentName=Desktop -o $OutputDir
    if ($LASTEXITCODE -ne 0) { throw "API publish failed" }
    
    Write-Host "Done: API build complete" -ForegroundColor Green
    Write-Host ""

    # Step 3: Packaging
    Write-Host "[3/4] Packaging application..." -ForegroundColor Green
    
    # NOTE: angular.json outputs relative to Angular/ to SourceCode\SQLAPI\POS.API\ClientApp
    $AngularDist = Join-Path $SourceRoot "POS.API\ClientApp"
    $ApiPublish = Join-Path $SourceRoot "publish\desktop\api"
    $WwwRoot = Join-Path $ApiPublish "wwwroot"
    
    if (Test-Path $WwwRoot) { Remove-Item -Recurse -Force $WwwRoot }
    New-Item -ItemType Directory -Force -Path $WwwRoot | Out-Null
    
    if (Test-Path $AngularDist) {
        Copy-Item -Path "$AngularDist\*" -Destination $WwwRoot -Recurse -Force
    } else {
        throw "Angular dist not found at $AngularDist"
    }
    
    # Copy Desktop-specific appsettings
    $DesktopSettings = Join-Path $SourceRoot "POS.API\appsettings.Desktop.json"
    $TargetSettings = Join-Path $ApiPublish "appsettings.json"
    Copy-Item -Path $DesktopSettings -Destination $TargetSettings -Force
    
    Write-Host "Done: Packaging complete" -ForegroundColor Green
    Write-Host ""

    # Step 4: Version Info
    Write-Host "[4/4] Creating version info..." -ForegroundColor Green
    
    $versionFile = Join-Path $ApiPublish "version.json"
    $versionInfo = @{
        Version = $Version
        BuildDate = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        DeploymentMode = "Desktop"
        DatabaseProvider = "Sqlite"
    } | ConvertTo-Json
    
    $versionInfo | Out-File -FilePath $versionFile -Encoding ASCII
    
    Write-Host "Done: Version info created" -ForegroundColor Green
    Write-Host ""

    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Desktop build complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Output: $ApiPublish" -ForegroundColor Yellow
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
