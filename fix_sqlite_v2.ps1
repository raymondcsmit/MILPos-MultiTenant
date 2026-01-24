$files = @(
    "f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Domain\Migrations\20250223073420_Initial.cs",
    "f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Domain\Migrations\20251002094155_Version_V1.cs"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Processing $file"
        $content = Get-Content $file -Raw
        $originalLength = $content.Length
        
        $content = $content -replace ', type: "nvarchar\(max\)"', ''
        $content = $content -replace ', type: "datetime2"', ''
        $content = $content -replace ', type: "bit"', ''
        $content = $content -replace ', type: "uniqueidentifier"', ''
        $content = $content -replace ', type: "date"', ''
        $content = $content -replace ', type: "datetimeoffset"', ''
        $content = $content -replace 'defaultValueSql: "GETUTCDATE\(\)"', 'defaultValueSql: utcDate'
        
        if ($content.Length -ne $originalLength) {
             Write-Host "Modified $file"
             Set-Content -Path $file -Value $content -Encoding UTF8
        } else {
             Write-Host "No changes in $file"
        }
    } else {
        Write-Host "File not found: $file"
    }
}

function Convert-SqlToSqlite {
    param ($InputFile, $OutputFile)
    if (Test-Path $InputFile) {
        Write-Host "Converting $InputFile to $OutputFile"
        $content = Get-Content $InputFile -Raw
        
        # Remove [dbo].
        $content = $content -replace '\[dbo\]\.', ''
        
        # Remove GO lines
        $content = $content -replace '(?m)^GO\r?$', ''
        
        # Handle N'string' -> 'string' (Case-sensitive replacement to avoid matching words ending in n)
        $content = $content -creplace "N'((?:''|[^'])*)'", "'`$1'"

        # Handle CAST(... AS DATETIME2(p)) or CAST(... AS DateTime2)
        # Example: CAST('2021-01-09T16:00:55.3200000' AS DATETIME2(0)) -> '2021-01-09T16:00:55.3200000'
        # Example: CAST('...' AS DateTime2) -> '...'
        $content = $content -replace "CAST\('([^']*)' AS DATETIME2(?:\(\d+\))?\)", "'`$1'"
        
        # Remove brackets around identifiers [Table] -> Table
        $content = $content -replace '\[(\w+)\]', '$1'
        
        # Add INTO to INSERT
        $content = $content -replace 'INSERT\s+([a-zA-Z0-9_]+)\s+\(', 'INSERT INTO $1 ('
        
        Set-Content -Path $OutputFile -Value $content -Encoding UTF8
    }
}

Convert-SqlToSqlite "f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Domain\Migrations\20250223073432_Initial_Data.sql" "f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Domain\Migrations\20250223073432_Initial_Data_Sqlite.sql"
Convert-SqlToSqlite "f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Domain\Migrations\20251002094214_Version_V1_Data.sql" "f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Domain\Migrations\20251002094214_Version_V1_Data_Sqlite.sql"
