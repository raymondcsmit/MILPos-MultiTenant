# Seed Data from CSV to SQLite Database
# This script reads CSV files from SeedData folder and inserts them into pos.db

param(
    [string]$DatabasePath = "pos.db",
    [string]$SeedDataPath = "..\SeedData"
)

Write-Host "=== POS Database Seeding Script ===" -ForegroundColor Cyan
Write-Host "Database: $DatabasePath" -ForegroundColor Yellow
Write-Host "Seed Data: $SeedDataPath" -ForegroundColor Yellow
Write-Host ""

# Check if database exists
if (-not (Test-Path $DatabasePath)) {
    Write-Host "Error: Database file '$DatabasePath' not found!" -ForegroundColor Red
    Write-Host "Please run 'dotnet ef database update' first to create the database." -ForegroundColor Yellow
    exit 1
}

# Check if SeedData folder exists
if (-not (Test-Path $SeedDataPath)) {
    Write-Host "Error: SeedData folder '$SeedDataPath' not found!" -ForegroundColor Red
    exit 1
}

# Install SQLite module if not already installed
if (-not (Get-Module -ListAvailable -Name PSSQLite)) {
    Write-Host "Installing PSSQLite module..." -ForegroundColor Yellow
    Install-Module -Name PSSQLite -Force -Scope CurrentUser
}

Import-Module PSSQLite

# Define table order for seeding (respecting foreign key dependencies)
$tableOrder = @(
    "Tenants",
    "Users",
    "Roles",
    "UserRoles",
    "UserClaims",
    "RoleClaims",
    "UserLogins",
    "UserTokens",
    "Countries",
    "Cities",
    "Currencies",
    "Languages",
    "CompanyProfiles",
    "Locations",
    "UserLocations",
    "Taxes",
    "LedgerAccounts",
    "FinancialYears",
    "ProductCategories",
    "Brands",
    "UnitConversations",
    "Products",
    "ProductTaxes",
    "ProductStocks",
    "Customers",
    "ContactAddresses",
    "Suppliers",
    "SupplierAddresses",
    "ExpenseCategories",
    "InquirySources",
    "InquiryStatuses",
    "Inquiries",
    "InquiryActivities",
    "InquiryAttachments",
    "InquiryNotes",
    "InquiryProducts",
    "PurchaseOrders",
    "PurchaseOrderItems",
    "PurchaseOrderItemTaxes",
    "PurchaseOrderPayments",
    "SalesOrders",
    "SalesOrderItems",
    "SalesOrderItemTaxes",
    "SalesOrderPayments",
    "Expenses",
    "ExpenseTaxes",
    "StockTransfers",
    "StockTransferItems",
    "DamagedStocks",
    "Transactions",
    "TransactionItems",
    "TransactionItemTaxes",
    "AccountingEntries",
    "PaymentEntries",
    "TaxEntries",
    "StockAdjustments",
    "CustomerLedgers",
    "LoanDetails",
    "LoanRepayments",
    "Payrolls",
    "Reminders",
    "ReminderNotifications",
    "ReminderUsers",
    "ReminderSchedulers",
    "DailyReminders",
    "QuarterlyReminders",
    "HalfYearlyReminders",
    "EmailSMTPSettings",
    "EmailTemplates",
    "SendEmails",
    "EmailLogs",
    "EmailLogAttachments",
    "ContactRequests",
    "Pages",
    "Actions",
    "Pagehelpers",
    "TableSettings",
    "LoginAudits",
    "NLog",
    "Variants",
    "VariantItems"
)

Write-Host "Starting data seeding..." -ForegroundColor Green
Write-Host ""

$totalTables = 0
$totalRecords = 0
$skippedTables = 0

foreach ($tableName in $tableOrder) {
    $csvFile = Join-Path $SeedDataPath "$tableName.csv"
    
    if (Test-Path $csvFile) {
        try {
            Write-Host "Seeding $tableName..." -NoNewline
            
            # Read CSV
            $data = Import-Csv $csvFile
            
            if ($data.Count -eq 0) {
                Write-Host " [EMPTY]" -ForegroundColor Yellow
                continue
            }
            
            # Get column names
            $columns = ($data[0].PSObject.Properties | Select-Object -ExpandProperty Name) -join ", "
            
            # Prepare insert statement
            $recordCount = 0
            foreach ($row in $data) {
                $values = @()
                foreach ($prop in $row.PSObject.Properties) {
                    $value = $prop.Value
                    if ([string]::IsNullOrWhiteSpace($value)) {
                        $values += "NULL"
                    } else {
                        # Escape single quotes
                        $value = $value.Replace("'", "''")
                        $values += "'$value'"
                    }
                }
                
                $valuesString = $values -join ", "
                $insertSql = "INSERT OR IGNORE INTO $tableName ($columns) VALUES ($valuesString);"
                
                try {
                    Invoke-SqliteQuery -DataSource $DatabasePath -Query $insertSql
                    $recordCount++
                } catch {
                    Write-Host ""
                    Write-Host "  Error inserting record: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
            
            Write-Host " [$recordCount records]" -ForegroundColor Green
            $totalTables++
            $totalRecords += $recordCount
            
        } catch {
            Write-Host " [ERROR: $($_.Exception.Message)]" -ForegroundColor Red
        }
    } else {
        Write-Host "Skipping $tableName (CSV not found)" -ForegroundColor DarkGray
        $skippedTables++
    }
}

Write-Host ""
Write-Host "=== Seeding Complete ===" -ForegroundColor Cyan
Write-Host "Tables seeded: $totalTables" -ForegroundColor Green
Write-Host "Total records: $totalRecords" -ForegroundColor Green
Write-Host "Skipped tables: $skippedTables" -ForegroundColor Yellow
Write-Host ""
Write-Host "Database seeding completed successfully!" -ForegroundColor Green
