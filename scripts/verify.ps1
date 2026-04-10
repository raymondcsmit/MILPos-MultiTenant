$ErrorActionPreference = "Stop"

Write-Host "Verification: Backend (.NET)" -ForegroundColor Cyan
dotnet --version | Out-Host

$sqlRoot = Join-Path $PSScriptRoot "..\\SourceCode\\SQLAPI"
$slnPath = Join-Path $sqlRoot "POS.sln"
$apiTestsPath = Join-Path $sqlRoot "Tests\\POS.API.Tests\\POS.API.Tests.csproj"

dotnet build $slnPath -c Release | Out-Host
dotnet test $apiTestsPath -c Release | Out-Host

Write-Host "Verification: Frontend (Angular)" -ForegroundColor Cyan
$ngRoot = Join-Path $PSScriptRoot "..\\SourceCode\\Angular"
$pkgPath = Join-Path $ngRoot "package.json"
if (Test-Path $pkgPath) {
    Push-Location $ngRoot
    try {
        npm --version | Out-Host
        npm install --no-fund --no-audit | Out-Host
        npm run build | Out-Host
        npm run test -- --watch=false --code-coverage | Out-Host
    } finally {
        Pop-Location
    }
}

Write-Host "Verification completed." -ForegroundColor Green

