$files = @(
    "f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Domain\Migrations\20250223073420_Initial.cs",
    "f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Domain\Migrations\20251002094155_Version_V1.cs"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Processing $file"
        $content = Get-Content $file -Raw
        
        # Remove type: "..." followed by comma
        $content = $content -replace 'type:\s*"[^"]*",\s*', ''
        
        # Remove comma followed by type: "..."
        $content = $content -replace ',\s*type:\s*"[^"]*"', ''
        
        # Remove type: "..." if it's the only/last argument (no commas around)
        # Be careful not to match things inside other strings, but in this context it's fine
        # We need to make sure we don't leave empty parentheses if it was the only arg?
        # table.Column<T>(type: "...") -> table.Column<T>()
        $content = $content -replace 'type:\s*"[^"]*"', ''

        Set-Content -Path $file -Value $content -Encoding UTF8
        Write-Host "Updated $file"
    } else {
        Write-Host "File not found: $file"
    }
}
