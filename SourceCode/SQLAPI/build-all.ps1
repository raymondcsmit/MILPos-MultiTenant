# Master Build Script - Build Both Desktop and Cloud Versions
param(
    [ValidateSet("Desktop", "Cloud", "Both")]
    [string]$Target = "Both",
    [string]$Version = "1.0.0",
    [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"
$SourceRoot = $PSScriptRoot

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   POS Application Build System        ║" -ForegroundColor Cyan
Write-Host "║   Version: $Version                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

function Build-Desktop {
    Write-Host "► Building Desktop Version..." -ForegroundColor Magenta
    Write-Host ""
    & "$SourceRoot\build-desktop.ps1" -Version $Version -Configuration $Configuration
    if ($LASTEXITCODE -ne 0) {
        throw "Desktop build failed"
    }
}

function Build-Cloud {
    Write-Host "► Building Cloud Version..." -ForegroundColor Magenta
    Write-Host ""
    & "$SourceRoot\build-cloud.ps1" -Version $Version -Configuration $Configuration
    if ($LASTEXITCODE -ne 0) {
        throw "Cloud build failed"
    }
}

try {
    $startTime = Get-Date

    switch ($Target) {
        "Desktop" {
            Build-Desktop
        }
        "Cloud" {
            Build-Cloud
        }
        "Both" {
            Build-Desktop
            Write-Host ""
            Write-Host "─────────────────────────────────────────" -ForegroundColor Gray
            Write-Host ""
            Build-Cloud
        }
    }

    $endTime = Get-Date
    $duration = $endTime - $startTime

    Write-Host ""
    Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║   All Builds Completed Successfully!  ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "Build Duration: $($duration.ToString('mm\:ss'))" -ForegroundColor Yellow
    Write-Host "Target: $Target" -ForegroundColor Yellow
    Write-Host "Version: $Version" -ForegroundColor Yellow
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║   Build Failed!                       ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    exit 1
}
