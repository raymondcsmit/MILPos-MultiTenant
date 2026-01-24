import os
import re

def fix_migration_cs(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Inject utcDate variable
    if 'var utcDate =' not in content and 'protected override void Up(MigrationBuilder migrationBuilder)' in content:
        content = content.replace(
            'protected override void Up(MigrationBuilder migrationBuilder)\n        {',
            'protected override void Up(MigrationBuilder migrationBuilder)\n        {\n            var utcDate = migrationBuilder.ActiveProvider.EndsWith("Sqlite") ? "CURRENT_TIMESTAMP" : "GETUTCDATE()";'
        )

    # Replace types
    patterns = [
        r', type: "nvarchar\(max\)"',
        r', type: "datetime2"',
        r', type: "bit"',
        r', type: "uniqueidentifier"',
        r', type: "date"',
        r', type: "datetimeoffset"'
    ]
    
    for p in patterns:
        content = re.sub(p, '', content)

    # Replace GETUTCDATE() with variable
    content = content.replace('"GETUTCDATE()"', 'utcDate')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_data_migration_cs(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Update regex logic for Sqlite suffix
    if 'var suffix =' not in content:
        old_code = r'var regex = new Regex($@"{Regex.Escape(type.Namespace)}\.\d{{14}}_{Regex.Escape(type.Name)}\.sql");'
        new_code = r'''var suffix = migrationBuilder.ActiveProvider.EndsWith("Sqlite") ? "_Sqlite.sql" : ".sql";
            var regex = new Regex($@"{Regex.Escape(type.Namespace)}\.\d{{14}}_{Regex.Escape(type.Name)}{Regex.Escape(suffix)}");'''
        
        # Careful with indentation and exact match
        # Try to find the block
        content = content.replace(
            'var regex = new Regex($@"{Regex.Escape(type.Namespace)}\.\d{{14}}_{Regex.Escape(type.Name)}\.sql");',
            new_code
        )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def convert_sql_to_sqlite(src_path, dest_path):
    with open(src_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove [dbo].
    content = content.replace('[dbo].', '')
    
    # Remove N prefix from string literals N'...'
    # This is tricky if not careful, but usually N' works in SQLite too? 
    # SQLite supports N'string' but it's just 'string'. 
    # But let's keep it simple. Replacing N' with ' might break if N is part of something else?
    # Usually N' is safe to keep in SQLite (it treats it as string).
    # But CAST(N'...' AS DATETIME2(0)) is the main issue.
    
    # Replace CAST(N'...' AS DATETIME2(x)) with '...'
    # Regex: CAST\(N'([^']*)' AS DATETIME2\(\d+\)\) -> '$1'
    content = re.sub(r"CAST\(N'([^']*)' AS DATETIME2\(\d+\)\)", r"'\1'", content)
    
    # Also without N prefix if any
    content = re.sub(r"CAST\('([^']*)' AS DATETIME2\(\d+\)\)", r"'\1'", content)
    
    # Handle GO
    content = re.sub(r'\nGO\s*\n', ';\n', content)
    content = re.sub(r'\nGO\n', ';\n', content)

    with open(dest_path, 'w', encoding='utf-8') as f:
        f.write(content)

base_path = r'f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Domain\Migrations'

# Fix C# migrations
fix_migration_cs(os.path.join(base_path, '20250223073420_Initial.cs'))
fix_migration_cs(os.path.join(base_path, '20251002094155_Version_V1.cs'))

# Fix Data migration CS
fix_data_migration_cs(os.path.join(base_path, '20251002094214_Version_V1_Data.cs'))

# Convert SQL
convert_sql_to_sqlite(
    os.path.join(base_path, '20251002094214_Version_V1_Data.sql'),
    os.path.join(base_path, '20251002094214_Version_V1_Data_Sqlite.sql')
)
