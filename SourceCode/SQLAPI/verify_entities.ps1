#!/usr/bin/env pwsh
# Comprehensive entity verification - checks actual class definitions

$entitiesToCheck = @(
    @{Name="MenuItem"; Namespace="POS.Data"; Path="MenuItem\MenuItem.cs"},
    @{Name="Customer"; Namespace="POS.Data"; Path="Customer\Customer.cs"},
    @{Name="Supplier"; Namespace="POS.Data"; Path="Supplier\Supplier.cs"},
    @{Name="ProductCategory"; Namespace="POS.Data.Entities"; Path="Product\ProductCategory.cs"},
    @{Name="Brand"; Namespace="POS.Data"; Path="Brand\Brand.cs"},
    @{Name="UnitConversation"; Namespace="POS.Data"; Path="Unit\UnitConversation.cs"},
    @{Name="Tax"; Namespace="POS.Data"; Path="Tax\Tax.cs"},
    @{Name="Location"; Namespace="POS.Data.Entities"; Path="Location\Location.cs"},
    @{Name="Product"; Namespace="POS.Data"; Path="Product\Product.cs"},
    @{Name="ProductStock"; Namespace="POS.Data.Entities"; Path="Product\ProductStock.cs"},
    @{Name="InventoryBatch"; Namespace="Data.Entities.Inventory"; Path="Inventory\InventoryBatch.cs"},
    @{Name="ExpenseCategory"; Namespace=""; Path="Expense\ExpenseCategory.cs"},
    @{Name="Expense"; Namespace=""; Path="Expense\Expense.cs"},
    @{Name="CompanyProfile"; Namespace=""; Path="CompanyProfile\CompanyProfile.cs"},
    @{Name="EmailTemplate"; Namespace=""; Path="Email\EmailTemplate.cs"},
    @{Name="EmailSMTPSetting"; Namespace=""; Path="Email\EmailSMTPSetting.cs"},
    @{Name="TableSetting"; Namespace="POS.Data.Entities"; Path="TableSetting\TableSetting.cs"},
    @{Name="SalesOrder"; Namespace=""; Path="SalesOrder\SalesOrder.cs"},
    @{Name="SalesOrderPayment"; Namespace="POS.Data"; Path="SalesOrder\SalesOrderPayment.cs"},
    @{Name="PurchaseOrder"; Namespace="POS.Data"; Path="PurchaseOrder\PurchaseOrder.cs"},
    @{Name="PurchaseOrderPayment"; Namespace="POS.Data"; Path="PurchaseOrder\PurchaseOrderPayment.cs"},
    @{Name="StockTransfer"; Namespace="POS.Data.Entities"; Path="StockTransfer\StockTransfer.cs"},
    @{Name="StockAdjustment"; Namespace="Data.Entities.Accounts"; Path="Accounts\StockAdjustment.cs"},
    @{Name="DamagedStock"; Namespace="Data.Entities"; Path="DamagedStock\DamagedStock.cs"},
    @{Name="FinancialYear"; Namespace="Data.Entities.Accounts"; Path="Accounts\FinancialYear.cs"},
    @{Name="LedgerAccount"; Namespace="Data.Entities.Accounts"; Path="Accounts\LedgerAccount.cs"},
    @{Name="Transaction"; Namespace="POS.Data.Entities"; Path="Transaction\Transaction.cs"},
    @{Name="AccountingEntry"; Namespace="Data.Entities.Accounts"; Path="Accounts\AccountingEntry.cs"},
    @{Name="PaymentEntry"; Namespace="Data.Entities.Accounts"; Path="Accounts\PaymentEntry.cs"},
    @{Name="TaxEntry"; Namespace="Data.Entities.Accounts"; Path="Accounts\TaxEntry.cs"},
    @{Name="Payroll"; Namespace="Data.Entities"; Path="Accounts\Payroll.cs"},
    @{Name="CustomerLedger"; Namespace="Data.Entities"; Path="CustomerLedger\CustomerLedger.cs"},
    @{Name="LoanDetail"; Namespace="Data.Entities.Accounts"; Path="Accounts\LoanDetail.cs"},
    @{Name="LoanRepayment"; Namespace="Data.Entities.Accounts"; Path="Accounts\LoanRepayment.cs"},
    @{Name="DailyProductPrice"; Namespace=""; Path="Product\DailyProductPrice.cs"}
)

$dataPath = "F:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Data\Entities"
$needsFix = @()

foreach ($entity in $entitiesToCheck) {
    $fullPath = Join-Path $dataPath $entity.Path
    
    if (Test-Path $fullPath) {
        $content = Get-Content $fullPath -Raw
        $inheritsFromBase = $content -match ":\s*BaseEntity"
        
        if (-not $inheritsFromBase) {
            $needsFix += $entity.Name
            Write-Host "❌ $($entity.Name) - MISSING BaseEntity" -ForegroundColor Red
        } else {
            Write-Host "✓ $($entity.Name)" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠ $($entity.Name) - FILE NOT FOUND: $fullPath" -ForegroundColor Yellow
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
if ($needsFix.Count -eq 0) {
    Write-Host "✓ ALL ENTITIES INHERIT FROM BaseEntity!" -ForegroundColor Green
} else {
    Write-Host "❌ ENTITIES NEEDING FIX: $($needsFix.Count)" -ForegroundColor Red
    $needsFix | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}
