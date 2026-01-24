
$folder = "f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Domain\Migrations"
$files = Get-ChildItem -Path $folder -Filter "*.cs"

foreach ($file in $files) {
    $path = $file.FullName
    Write-Host "Processing $path"
    $content = Get-Content $path -Raw

    # Replace explicit types
    $content = $content -replace 'type: "nvarchar\(max\)"', 'type: "TEXT"'
    $content = $content -replace 'type: "uniqueidentifier"', 'type: "TEXT"'
    $content = $content -replace 'type: "bit"', 'type: "INTEGER"'
    $content = $content -replace 'type: "decimal\(18,2\)"', 'type: "TEXT"'
    $content = $content -replace 'type: "datetime2"', 'type: "TEXT"'
    $content = $content -replace 'type: "int"', 'type: "INTEGER"'

    # Now inject types where missing using [\s\S] to match across newlines
    # For AddColumn
    $content = [regex]::Replace($content, '(AddColumn<string>\s*\((?:(?!type:)[\s\S])*?)(nullable:)', '$1type: "TEXT", $2')
    $content = [regex]::Replace($content, '(AddColumn<Guid>\s*\((?:(?!type:)[\s\S])*?)(nullable:)', '$1type: "TEXT", $2')
    $content = [regex]::Replace($content, '(AddColumn<bool>\s*\((?:(?!type:)[\s\S])*?)(nullable:)', '$1type: "INTEGER", $2')
    $content = [regex]::Replace($content, '(AddColumn<int>\s*\((?:(?!type:)[\s\S])*?)(nullable:)', '$1type: "INTEGER", $2')
    $content = [regex]::Replace($content, '(AddColumn<DateTime>\s*\((?:(?!type:)[\s\S])*?)(nullable:)', '$1type: "TEXT", $2')
    $content = [regex]::Replace($content, '(AddColumn<decimal>\s*\((?:(?!type:)[\s\S])*?)(nullable:)', '$1type: "TEXT", $2')

    # For CreateTable Column
    $content = [regex]::Replace($content, '(Column<string>\((?:(?!type:)[\s\S])*?)(nullable:|maxLength:)', '$1type: "TEXT", $2')
    $content = [regex]::Replace($content, '(Column<Guid>\((?:(?!type:)[\s\S])*?)(nullable:)', '$1type: "TEXT", $2')
    $content = [regex]::Replace($content, '(Column<bool>\((?:(?!type:)[\s\S])*?)(nullable:)', '$1type: "INTEGER", $2')
    $content = [regex]::Replace($content, '(Column<int>\((?:(?!type:)[\s\S])*?)(nullable:)', '$1type: "INTEGER", $2')
    $content = [regex]::Replace($content, '(Column<DateTime>\((?:(?!type:)[\s\S])*?)(nullable:)', '$1type: "TEXT", $2')
    $content = [regex]::Replace($content, '(Column<decimal>\((?:(?!type:)[\s\S])*?)(nullable:)', '$1type: "TEXT", $2')

    Set-Content -Path $path -Value $content
    Write-Host "Fixed migration file: $path"
}
