
$sourceFile = "f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Domain\Migrations\20251002094214_Version_V1_Data.sql"
$targetFile = "f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Domain\Migrations\Sqlite\20251002094214_Version_V1_Data_Sqlite.sql"

if (-not (Test-Path $sourceFile)) {
    Write-Error "Source file not found: $sourceFile"
    exit 1
}

$content = Get-Content $sourceFile -Raw

# Remove [dbo].
$content = $content -replace "\[dbo\]\.", ""

# Replace GO with semicolon
$content = $content -replace "(?m)^GO\s*$", ";"

# Fix DateTime2 casts
# CAST(N'...' AS DATETIME2(0)) -> '...'
# Regex to match CAST(N'...' AS DATETIME2(any_digit))
$content = [regex]::Replace($content, "CAST\(N'([^']+)' AS DATETIME2\(\d*\)\)", "'$1'")
# Also match generic DateTime2 without precision if any
$content = [regex]::Replace($content, "CAST\(N'([^']+)' AS DATETIME2\)", "'$1'")

# Fix IsActive 1/0 bits if they are somehow different (usually 1/0 works in SQLite for boolean columns defined as INTEGER/BOOLEAN)
# The source uses 1 and 0, which is fine for SQLite INTEGER columns.

# Remove IsDeleted, IsTemporary if they are bit? No, they are 0/1 in SQL.
# SQLite treats them as numbers.

Set-Content -Path $targetFile -Value $content
Write-Host "Converted $sourceFile to SQLite format in $targetFile"
