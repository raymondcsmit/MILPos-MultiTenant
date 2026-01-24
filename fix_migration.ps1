
$file = "f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Domain\Migrations\20250223073420_Initial.cs"
$content = Get-Content $file -Raw

# Replace string (excluding those that already have type)
$content = [Regex]::Replace($content, 'table\.Column<string>\((?!\s*type:)', 'table.Column<string>(type: "TEXT", ')

# Replace Guid
$content = [Regex]::Replace($content, 'table\.Column<Guid>\((?!\s*type:)', 'table.Column<Guid>(type: "TEXT", ')

# Replace bool
$content = [Regex]::Replace($content, 'table\.Column<bool>\((?!\s*type:)', 'table.Column<bool>(type: "INTEGER", ')

# Replace DateTime
$content = [Regex]::Replace($content, 'table\.Column<DateTime>\((?!\s*type:)', 'table.Column<DateTime>(type: "TEXT", ')

# Fix any double commas or issues if injection happened poorly (though regex above puts comma at end)
# The original usually starts with `nullable: ...` or `maxLength: ...`.
# Example: `table.Column<string>( nullable: true)` becomes `table.Column<string>(type: "TEXT",  nullable: true)`

Set-Content -Path $file -Value $content
Write-Host "Migration file updated."
