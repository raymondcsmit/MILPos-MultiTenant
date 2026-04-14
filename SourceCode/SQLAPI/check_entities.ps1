#!/usr/bin/env pwsh
# Script to check which entities used in TransferTenantData inherit from BaseEntity

$entities = @(
    "POS.Data.MenuItem",
    "POS.Data.Customer",
    "POS.Data.Supplier",
    "POS.Data.Entities.ProductCategory",
    "POS.Data.Brand",
    "POS.Data.UnitConversation",
    "POS.Data.Tax",
    "POS.Data.Entities.Location",
    "POS.Data.Product",
    "POS.Data.Entities.ProductStock",
    "Data.Entities.Inventory.InventoryBatch",
    "ExpenseCategory",
    "Expense",
    "CompanyProfile",
    "EmailTemplate",
    "EmailSMTPSetting",
    "POS.Data.Entities.TableSetting",
    "SalesOrderEntity",
    "POS.Data.SalesOrderPayment",
    "POS.Data.PurchaseOrder",
    "POS.Data.PurchaseOrderPayment",
    "POS.Data.Entities.StockTransfer",
    "Data.Entities.Accounts.StockAdjustment",
    "Data.Entities.DamagedStock",
    "Data.Entities.Accounts.FinancialYear",
    "Data.Entities.Accounts.LedgerAccount",
    "POS.Data.Entities.Transaction",
    "Data.Entities.Accounts.AccountingEntry",
    "Data.Entities.Accounts.PaymentEntry",
    "Data.Entities.Accounts.TaxEntry",
    "Data.Entities.Payroll",
    "Data.Entities.CustomerLedger",
    "Data.Entities.Accounts.LoanDetail",
    "Data.Entities.Accounts.LoanRepayment",
    "DailyProductPriceEntity"
)

$dataPath = "F:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Data\Entities"
$results = @()

foreach ($entity in $entities) {
    # Convert entity name to file path
    $simpleName = $entity -replace "^(POS\.Data\.|Data\.Entities\.|POS\.Data\.Entities\.)", ""
    $simpleName = $simpleName -replace "Entity$", ""
    
    # Try to find the file
    $files = Get-ChildItem -Path $dataPath -Recurse -Filter "$simpleName.cs" -ErrorAction SilentlyContinue
    
    if ($files) {
        $file = $files[0]
        $content = Get-Content $file.FullName -Raw
        
        $inheritsFromBase = $content -match "class\s+$simpleName\s*:\s*BaseEntity"
        $hasOwnId = $content -match "public\s+Guid\s+Id\s*\{\s*get;\s*set;"
        
        $results += [PSCustomObject]@{
            Entity = $entity
            File = $file.FullName
            InheritsFromBaseEntity = $inheritsFromBase
            HasOwnId = $hasOwnId
            NeedsFix = (-not $inheritsFromBase) -and $hasOwnId
        }
    } else {
        $results += [PSCustomObject]@{
            Entity = $entity
            File = "NOT FOUND"
            InheritsFromBaseEntity = $false
            HasOwnId = $false
            NeedsFix = $false
        }
    }
}

Write-Host "`n=== Entities Needing Fix (Have own Id but don't inherit from BaseEntity) ===" -ForegroundColor Red
$results | Where-Object { $_.NeedsFix } | Format-Table -AutoSize

Write-Host "`n=== All Results ===" -ForegroundColor Yellow
$results | Format-Table -AutoSize

Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "Total entities checked: $($results.Count)"
Write-Host "Entities needing fix: $(($results | Where-Object { $_.NeedsFix }).Count)"
Write-Host "Entities already inheriting from BaseEntity: $(($results | Where-Object { $_.InheritsFromBaseEntity }).Count)"
