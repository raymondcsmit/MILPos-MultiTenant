$files = @('f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Domain\Migrations\20250223073420_Initial.cs', 'f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Domain\Migrations\20251002094155_Version_V1.cs', 'f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Domain\DefaultEntityMappingExtension.cs')
foreach ($file in $files) {
    $content = Get-Content $file -Raw
    # Remove explicit types that are incompatible with SQLite
    $content = $content -replace ', type: "nvarchar\(max\)"', ''
    $content = $content -replace 'type: "nvarchar\(max\)",', ''
    $content = $content -replace 'type: "nvarchar\(max\)"', ''
    
    $content = $content -replace ', type: "nvarchar\(\d+\)"', ''
    $content = $content -replace 'type: "nvarchar\(\d+\)",', ''
    $content = $content -replace 'type: "nvarchar\(\d+\)"', ''
    
    $content = $content -replace ', type: "uniqueidentifier"', ''
    $content = $content -replace 'type: "uniqueidentifier",', ''
    $content = $content -replace 'type: "uniqueidentifier"', ''
    
    $content = $content -replace ', type: "bit"', ''
    $content = $content -replace 'type: "bit",', ''
    $content = $content -replace 'type: "bit"', ''
    
    $content = $content -replace ', type: "datetime2"', ''
    $content = $content -replace 'type: "datetime2",', ''
    $content = $content -replace 'type: "datetime2"', ''

    $content = $content -replace ', type: "date"', ''
    $content = $content -replace 'type: "date",', ''
    $content = $content -replace 'type: "date"', ''

    $content = $content -replace ', type: "datetimeoffset"', ''
    $content = $content -replace 'type: "datetimeoffset",', ''
    $content = $content -replace 'type: "datetimeoffset"', ''

    # Replace SQL Server specific default value
    $content = $content -replace 'defaultValueSql: "GETUTCDATE\(\)"', 'defaultValueSql: "CURRENT_TIMESTAMP"'
    $content = $content -replace 'HasDefaultValueSql\("GETUTCDATE\(\)"\)', 'HasDefaultValueSql("CURRENT_TIMESTAMP")'
    
    Set-Content -Path $file -Value $content -Encoding UTF8
}
