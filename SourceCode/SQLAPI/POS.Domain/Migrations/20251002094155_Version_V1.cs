using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace POS.Domain.Migrations
{
    /// <inheritdoc />
    public partial class Version_V1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DailyStocks");

            migrationBuilder.DropTable(
                name: "Inventories");

            migrationBuilder.DropTable(
                name: "InventoryHistories");

            migrationBuilder.AddColumn<string>(
                name: "InPutAccountCode",
                table: "Taxes",
                
                type: "TEXT", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OutPutAccountCode",
                table: "Taxes",
                
                type: "TEXT", nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "FlatDiscount",
                table: "SalesOrders",
                type: "TEXT",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalRefundAmount",
                table: "SalesOrders",
                type: "TEXT",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalRoundOff",
                table: "SalesOrders",
                type: "TEXT",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "PaymentType",
                table: "SalesOrderPayments",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "DiscountType",
                table: "SalesOrderItems",
                
                type: "TEXT", nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PurchasePrice",
                table: "SalesOrderItems",
                type: "TEXT",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalRefundAmount",
                table: "PurchaseOrders",
                type: "TEXT",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalRoundOff",
                table: "PurchaseOrders",
                type: "TEXT",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "PaymentType",
                table: "PurchaseOrderPayments",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "DiscountType",
                table: "PurchaseOrderItems",
                
                type: "TEXT", nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CurrentStock",
                table: "Products",
                type: "TEXT",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TaxAmount",
                table: "Products",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LicenseKey",
                table: "CompanyProfiles",
                
                type: "TEXT", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PurchaseCode",
                table: "CompanyProfiles",
                
                type: "TEXT", nullable: true);

            migrationBuilder.CreateTable(
                name: "CustomerLedgers",
                columns: table => new
                {
                    Id = table.Column<Guid>( type: "TEXT", nullable: false),
                    Date = table.Column<DateTime>( type: "TEXT", nullable: false),
                    CustomerId = table.Column<Guid>( type: "TEXT", nullable: true),
                    AccountName = table.Column<string>( type: "TEXT", nullable: true),
                    LocationId = table.Column<Guid>( type: "TEXT", nullable: false),
                    Description = table.Column<string>( type: "TEXT", nullable: true),
                    Amount = table.Column<decimal>(type: "TEXT", nullable: false),
                    Reference = table.Column<string>( type: "TEXT", nullable: true),
                    Balance = table.Column<decimal>(type: "TEXT", nullable: false),
                    Overdue = table.Column<decimal>(type: "TEXT", nullable: false),
                    Note = table.Column<string>( type: "TEXT", nullable: true),
                    CreatedDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>( type: "TEXT", nullable: false),
                    ModifiedDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    ModifiedBy = table.Column<Guid>( type: "TEXT", nullable: false),
                    DeletedDate = table.Column<DateTime>( type: "TEXT", nullable: true),
                    DeletedBy = table.Column<Guid>( type: "TEXT", nullable: true),
                    IsDeleted = table.Column<bool>( type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerLedgers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CustomerLedgers_Customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CustomerLedgers_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CustomerLedgers_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "FinancialYears",
                columns: table => new
                {
                    Id = table.Column<Guid>( type: "TEXT", nullable: false),
                    StartDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    EndDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    IsClosed = table.Column<bool>( type: "INTEGER", nullable: false),
                    ClosedDate = table.Column<DateTime>( type: "TEXT", nullable: true),
                    ClosedBy = table.Column<Guid>( type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FinancialYears", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LedgerAccounts",
                columns: table => new
                {
                    Id = table.Column<Guid>( type: "TEXT", nullable: false),
                    AccountCode = table.Column<string>( type: "TEXT", maxLength: 10, nullable: false),
                    AccountName = table.Column<string>( type: "TEXT", maxLength: 100, nullable: false),
                    AccountType = table.Column<int>(type: "INTEGER", nullable: false),
                    AccountGroup = table.Column<int>(type: "INTEGER", nullable: false),
                    ParentAccountId = table.Column<Guid>( type: "TEXT", nullable: true),
                    OpeningBalance = table.Column<decimal>(type: "TEXT", nullable: false),
                    IsActive = table.Column<bool>( type: "INTEGER", nullable: false),
                    IsTemporary = table.Column<bool>( type: "INTEGER", nullable: false),
                    IsSystem = table.Column<bool>( type: "INTEGER", nullable: false, defaultValue: true),
                    CreatedDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>( type: "TEXT", nullable: false),
                    ModifiedDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    ModifiedBy = table.Column<Guid>( type: "TEXT", nullable: false),
                    DeletedDate = table.Column<DateTime>( type: "TEXT", nullable: true),
                    DeletedBy = table.Column<Guid>( type: "TEXT", nullable: true),
                    IsDeleted = table.Column<bool>( type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LedgerAccounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LedgerAccounts_LedgerAccounts_ParentAccountId",
                        column: x => x.ParentAccountId,
                        principalTable: "LedgerAccounts",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_LedgerAccounts_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductStocks",
                columns: table => new
                {
                    Id = table.Column<Guid>( type: "TEXT", nullable: false),
                    CurrentStock = table.Column<decimal>(type: "TEXT", nullable: false),
                    PurchasePrice = table.Column<decimal>(type: "TEXT", nullable: false),
                    LocationId = table.Column<Guid>( type: "TEXT", nullable: false),
                    ProductId = table.Column<Guid>( type: "TEXT", nullable: false),
                    ModifiedDate = table.Column<DateTime>( type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductStocks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductStocks_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductStocks_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "StockAdjustments",
                columns: table => new
                {
                    Id = table.Column<Guid>( type: "TEXT", nullable: false),
                    InventoryItemId = table.Column<Guid>( type: "TEXT", nullable: false),
                    BranchId = table.Column<Guid>( type: "TEXT", nullable: false),
                    AdjustmentType = table.Column<int>(type: "INTEGER", nullable: false),
                    Quantity = table.Column<decimal>(type: "TEXT", nullable: false),
                    UnitCost = table.Column<decimal>(type: "TEXT", nullable: false),
                    TotalValue = table.Column<decimal>(type: "TEXT", nullable: false),
                    Reason = table.Column<string>( type: "TEXT", maxLength: 500, nullable: true),
                    Reference = table.Column<string>( type: "TEXT", maxLength: 50, nullable: true),
                    AdjustmentDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>( type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockAdjustments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StockAdjustments_Locations_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StockAdjustments_Products_InventoryItemId",
                        column: x => x.InventoryItemId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Payrolls",
                columns: table => new
                {
                    Id = table.Column<Guid>( type: "TEXT", nullable: false),
                    EmployeeId = table.Column<Guid>( type: "TEXT", nullable: false),
                    BranchId = table.Column<Guid>( type: "TEXT", nullable: false),
                    SalaryMonth = table.Column<int>(type: "INTEGER", nullable: false),
                    MobileBill = table.Column<decimal>(type: "TEXT", nullable: false),
                    FoodBill = table.Column<decimal>(type: "TEXT", nullable: false),
                    Bonus = table.Column<decimal>(type: "TEXT", nullable: false),
                    Commission = table.Column<decimal>(type: "TEXT", nullable: false),
                    FestivalBonus = table.Column<decimal>(type: "TEXT", nullable: false),
                    TravelAllowance = table.Column<decimal>(type: "TEXT", nullable: false),
                    Others = table.Column<decimal>(type: "TEXT", nullable: false),
                    BasicSalary = table.Column<decimal>(type: "TEXT", nullable: false),
                    Advance = table.Column<decimal>(type: "TEXT", nullable: false),
                    TotalSalary = table.Column<decimal>(type: "TEXT", nullable: false),
                    PaymentMode = table.Column<int>(type: "INTEGER", nullable: false),
                    ChequeNo = table.Column<string>( type: "TEXT", nullable: true),
                    SalaryDate = table.Column<DateOnly>( nullable: false),
                    Note = table.Column<string>( type: "TEXT", nullable: true),
                    Attachment = table.Column<string>( type: "TEXT", nullable: true),
                    FinancialYearId = table.Column<Guid>( type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payrolls", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Payrolls_FinancialYears_FinancialYearId",
                        column: x => x.FinancialYearId,
                        principalTable: "FinancialYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Payrolls_Locations_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Payrolls_Users_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Transactions",
                columns: table => new
                {
                    Id = table.Column<Guid>( type: "TEXT", nullable: false),
                    TransactionNumber = table.Column<string>( type: "TEXT", maxLength: 20, nullable: false),
                    TransactionType = table.Column<int>(type: "INTEGER", nullable: false),
                    BranchId = table.Column<Guid>( type: "TEXT", nullable: false),
                    TransactionDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    SubTotal = table.Column<decimal>(type: "TEXT", nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    FlatDiscount = table.Column<decimal>(type: "TEXT", nullable: false),
                    TaxAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    RoundOffAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    Narration = table.Column<string>( type: "TEXT", maxLength: 500, nullable: true),
                    ReferenceNumber = table.Column<string>( type: "TEXT", maxLength: 50, nullable: true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    PaymentStatus = table.Column<int>(type: "INTEGER", nullable: false),
                    PaidAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    ReturnItemsAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    BalanceAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    FinancialYearId = table.Column<Guid>( type: "TEXT", nullable: false),
                    CreatedDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>( type: "TEXT", nullable: false),
                    ModifiedDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    ModifiedBy = table.Column<Guid>( type: "TEXT", nullable: false),
                    DeletedDate = table.Column<DateTime>( type: "TEXT", nullable: true),
                    DeletedBy = table.Column<Guid>( type: "TEXT", nullable: true),
                    IsDeleted = table.Column<bool>( type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Transactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Transactions_FinancialYears_FinancialYearId",
                        column: x => x.FinancialYearId,
                        principalTable: "FinancialYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Transactions_Locations_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Transactions_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "LoanDetails",
                columns: table => new
                {
                    Id = table.Column<Guid>( type: "TEXT", nullable: false),
                    LoanAccountId = table.Column<Guid>( type: "TEXT", nullable: false),
                    LoanAccountInterestExpenseId = table.Column<Guid>( type: "TEXT", nullable: false),
                    LoanAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    LenderName = table.Column<string>( type: "TEXT", nullable: true),
                    LoanDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    Narration = table.Column<string>( type: "TEXT", nullable: true),
                    BranchId = table.Column<Guid>( type: "TEXT", nullable: false),
                    LoanNumber = table.Column<string>( type: "TEXT", nullable: true),
                    CreatedDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>( type: "TEXT", nullable: false),
                    ModifiedDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    ModifiedBy = table.Column<Guid>( type: "TEXT", nullable: false),
                    DeletedDate = table.Column<DateTime>( type: "TEXT", nullable: true),
                    DeletedBy = table.Column<Guid>( type: "TEXT", nullable: true),
                    IsDeleted = table.Column<bool>( type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoanDetails", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LoanDetails_LedgerAccounts_LoanAccountId",
                        column: x => x.LoanAccountId,
                        principalTable: "LedgerAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LoanDetails_LedgerAccounts_LoanAccountInterestExpenseId",
                        column: x => x.LoanAccountInterestExpenseId,
                        principalTable: "LedgerAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LoanDetails_Locations_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LoanDetails_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "AccountingEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>( type: "TEXT", nullable: false),
                    TransactionId = table.Column<Guid>( type: "TEXT", nullable: false),
                    BranchId = table.Column<Guid>( type: "TEXT", nullable: false),
                    DebitLedgerAccountId = table.Column<Guid>( type: "TEXT", nullable: false),
                    CreditLedgerAccountId = table.Column<Guid>( type: "TEXT", nullable: false),
                    Amount = table.Column<decimal>(type: "TEXT", nullable: false),
                    Narration = table.Column<string>( type: "TEXT", maxLength: 500, nullable: true),
                    Reference = table.Column<string>( type: "TEXT", maxLength: 50, nullable: true),
                    EntryDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    EntryType = table.Column<int>(type: "INTEGER", nullable: false),
                    FinancialYearId = table.Column<Guid>( type: "TEXT", nullable: false),
                    CreatedDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>( type: "TEXT", nullable: false),
                    ModifiedDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    ModifiedBy = table.Column<Guid>( type: "TEXT", nullable: false),
                    DeletedDate = table.Column<DateTime>( type: "TEXT", nullable: true),
                    DeletedBy = table.Column<Guid>( type: "TEXT", nullable: true),
                    IsDeleted = table.Column<bool>( type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccountingEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AccountingEntries_FinancialYears_FinancialYearId",
                        column: x => x.FinancialYearId,
                        principalTable: "FinancialYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AccountingEntries_LedgerAccounts_CreditLedgerAccountId",
                        column: x => x.CreditLedgerAccountId,
                        principalTable: "LedgerAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AccountingEntries_LedgerAccounts_DebitLedgerAccountId",
                        column: x => x.DebitLedgerAccountId,
                        principalTable: "LedgerAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AccountingEntries_Locations_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AccountingEntries_Transactions_TransactionId",
                        column: x => x.TransactionId,
                        principalTable: "Transactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AccountingEntries_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PaymentEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>( type: "TEXT", nullable: false),
                    TransactionId = table.Column<Guid>( type: "TEXT", nullable: false),
                    BranchId = table.Column<Guid>( type: "TEXT", nullable: false),
                    PaymentMethod = table.Column<int>(type: "INTEGER", nullable: false),
                    Amount = table.Column<decimal>(type: "TEXT", nullable: false),
                    PaymentDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    ReferenceNumber = table.Column<string>( type: "TEXT", maxLength: 100, nullable: true),
                    Narration = table.Column<string>( type: "TEXT", maxLength: 500, nullable: true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>( type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentEntries_Locations_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PaymentEntries_Transactions_TransactionId",
                        column: x => x.TransactionId,
                        principalTable: "Transactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TaxEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>( type: "TEXT", nullable: false),
                    TransactionId = table.Column<Guid>( type: "TEXT", nullable: false),
                    BranchId = table.Column<Guid>( type: "TEXT", nullable: false),
                    TaxType = table.Column<int>(type: "INTEGER", nullable: false),
                    TaxPercentage = table.Column<decimal>(type: "TEXT", nullable: false),
                    TaxableAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    TaxAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    TaxDescription = table.Column<string>( type: "TEXT", maxLength: 50, nullable: true),
                    CreatedDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>( type: "TEXT", nullable: false),
                    ModifiedDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    ModifiedBy = table.Column<Guid>( type: "TEXT", nullable: false),
                    DeletedDate = table.Column<DateTime>( type: "TEXT", nullable: true),
                    DeletedBy = table.Column<Guid>( type: "TEXT", nullable: true),
                    IsDeleted = table.Column<bool>( type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaxEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TaxEntries_Locations_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TaxEntries_Transactions_TransactionId",
                        column: x => x.TransactionId,
                        principalTable: "Transactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TaxEntries_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TransactionItems",
                columns: table => new
                {
                    Id = table.Column<Guid>( type: "TEXT", nullable: false),
                    TransactionId = table.Column<Guid>( type: "TEXT", nullable: false),
                    InventoryItemId = table.Column<Guid>( type: "TEXT", nullable: false),
                    Quantity = table.Column<decimal>(type: "TEXT", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "TEXT", nullable: false),
                    DiscountPercentage = table.Column<decimal>(type: "TEXT", nullable: false),
                    DiscountType = table.Column<string>( type: "TEXT", nullable: true),
                    DiscountAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    TaxPercentage = table.Column<decimal>(type: "TEXT", nullable: false),
                    TaxAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    LineTotal = table.Column<decimal>(type: "TEXT", nullable: false),
                    PurchasePrice = table.Column<decimal>(type: "TEXT", nullable: false),
                    UnitId = table.Column<Guid>( type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransactionItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TransactionItems_Products_InventoryItemId",
                        column: x => x.InventoryItemId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TransactionItems_Transactions_TransactionId",
                        column: x => x.TransactionId,
                        principalTable: "Transactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TransactionItems_UnitConversations_UnitId",
                        column: x => x.UnitId,
                        principalTable: "UnitConversations",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "LoanRepayments",
                columns: table => new
                {
                    Id = table.Column<Guid>( type: "TEXT", nullable: false),
                    LoanDetailId = table.Column<Guid>( type: "TEXT", nullable: false),
                    PricipalAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    InterestAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    PaymentDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    Note = table.Column<string>( type: "TEXT", nullable: true),
                    CreatedDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>( type: "TEXT", nullable: false),
                    ModifiedDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    ModifiedBy = table.Column<Guid>( type: "TEXT", nullable: false),
                    DeletedDate = table.Column<DateTime>( type: "TEXT", nullable: true),
                    DeletedBy = table.Column<Guid>( type: "TEXT", nullable: true),
                    IsDeleted = table.Column<bool>( type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoanRepayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LoanRepayments_LoanDetails_LoanDetailId",
                        column: x => x.LoanDetailId,
                        principalTable: "LoanDetails",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LoanRepayments_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "TransactionItemTaxes",
                columns: table => new
                {
                    TransactionItemId = table.Column<Guid>( type: "TEXT", nullable: false),
                    TaxId = table.Column<Guid>( type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransactionItemTaxes", x => new { x.TransactionItemId, x.TaxId });
                    table.ForeignKey(
                        name: "FK_TransactionItemTaxes_Taxes_TaxId",
                        column: x => x.TaxId,
                        principalTable: "Taxes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TransactionItemTaxes_TransactionItems_TransactionItemId",
                        column: x => x.TransactionItemId,
                        principalTable: "TransactionItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AccountingEntries_BranchId",
                table: "AccountingEntries",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_AccountingEntries_CreatedBy",
                table: "AccountingEntries",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_AccountingEntries_CreditLedgerAccountId",
                table: "AccountingEntries",
                column: "CreditLedgerAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_AccountingEntries_DebitLedgerAccountId",
                table: "AccountingEntries",
                column: "DebitLedgerAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_AccountingEntries_FinancialYearId",
                table: "AccountingEntries",
                column: "FinancialYearId");

            migrationBuilder.CreateIndex(
                name: "IX_AccountingEntries_TransactionId",
                table: "AccountingEntries",
                column: "TransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerLedgers_CreatedBy",
                table: "CustomerLedgers",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerLedgers_CustomerId",
                table: "CustomerLedgers",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerLedgers_LocationId",
                table: "CustomerLedgers",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_LedgerAccounts_CreatedBy",
                table: "LedgerAccounts",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_LedgerAccounts_ParentAccountId",
                table: "LedgerAccounts",
                column: "ParentAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_LoanDetails_BranchId",
                table: "LoanDetails",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_LoanDetails_CreatedBy",
                table: "LoanDetails",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_LoanDetails_LoanAccountId",
                table: "LoanDetails",
                column: "LoanAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_LoanDetails_LoanAccountInterestExpenseId",
                table: "LoanDetails",
                column: "LoanAccountInterestExpenseId");

            migrationBuilder.CreateIndex(
                name: "IX_LoanRepayments_CreatedBy",
                table: "LoanRepayments",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_LoanRepayments_LoanDetailId",
                table: "LoanRepayments",
                column: "LoanDetailId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentEntries_BranchId",
                table: "PaymentEntries",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentEntries_TransactionId",
                table: "PaymentEntries",
                column: "TransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_Payrolls_BranchId",
                table: "Payrolls",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Payrolls_EmployeeId",
                table: "Payrolls",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_Payrolls_FinancialYearId",
                table: "Payrolls",
                column: "FinancialYearId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductStocks_LocationId",
                table: "ProductStocks",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductStocks_ProductId",
                table: "ProductStocks",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_StockAdjustments_BranchId",
                table: "StockAdjustments",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_StockAdjustments_InventoryItemId",
                table: "StockAdjustments",
                column: "InventoryItemId");

            migrationBuilder.CreateIndex(
                name: "IX_TaxEntries_BranchId",
                table: "TaxEntries",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_TaxEntries_CreatedBy",
                table: "TaxEntries",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_TaxEntries_TransactionId",
                table: "TaxEntries",
                column: "TransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionItems_InventoryItemId",
                table: "TransactionItems",
                column: "InventoryItemId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionItems_TransactionId",
                table: "TransactionItems",
                column: "TransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionItems_UnitId",
                table: "TransactionItems",
                column: "UnitId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionItemTaxes_TaxId",
                table: "TransactionItemTaxes",
                column: "TaxId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_BranchId",
                table: "Transactions",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_CreatedBy",
                table: "Transactions",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_FinancialYearId",
                table: "Transactions",
                column: "FinancialYearId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AccountingEntries");

            migrationBuilder.DropTable(
                name: "CustomerLedgers");

            migrationBuilder.DropTable(
                name: "LoanRepayments");

            migrationBuilder.DropTable(
                name: "PaymentEntries");

            migrationBuilder.DropTable(
                name: "Payrolls");

            migrationBuilder.DropTable(
                name: "ProductStocks");

            migrationBuilder.DropTable(
                name: "StockAdjustments");

            migrationBuilder.DropTable(
                name: "TaxEntries");

            migrationBuilder.DropTable(
                name: "TransactionItemTaxes");

            migrationBuilder.DropTable(
                name: "LoanDetails");

            migrationBuilder.DropTable(
                name: "TransactionItems");

            migrationBuilder.DropTable(
                name: "LedgerAccounts");

            migrationBuilder.DropTable(
                name: "Transactions");

            migrationBuilder.DropTable(
                name: "FinancialYears");

            migrationBuilder.DropColumn(
                name: "InPutAccountCode",
                table: "Taxes");

            migrationBuilder.DropColumn(
                name: "OutPutAccountCode",
                table: "Taxes");

            migrationBuilder.DropColumn(
                name: "FlatDiscount",
                table: "SalesOrders");

            migrationBuilder.DropColumn(
                name: "TotalRefundAmount",
                table: "SalesOrders");

            migrationBuilder.DropColumn(
                name: "TotalRoundOff",
                table: "SalesOrders");

            migrationBuilder.DropColumn(
                name: "PaymentType",
                table: "SalesOrderPayments");

            migrationBuilder.DropColumn(
                name: "DiscountType",
                table: "SalesOrderItems");

            migrationBuilder.DropColumn(
                name: "PurchasePrice",
                table: "SalesOrderItems");

            migrationBuilder.DropColumn(
                name: "TotalRefundAmount",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "TotalRoundOff",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "PaymentType",
                table: "PurchaseOrderPayments");

            migrationBuilder.DropColumn(
                name: "DiscountType",
                table: "PurchaseOrderItems");

            migrationBuilder.DropColumn(
                name: "CurrentStock",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "TaxAmount",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "LicenseKey",
                table: "CompanyProfiles");

            migrationBuilder.DropColumn(
                name: "PurchaseCode",
                table: "CompanyProfiles");

            migrationBuilder.CreateTable(
                name: "DailyStocks",
                columns: table => new
                {
                    Id = table.Column<Guid>( type: "TEXT", nullable: false),
                    LocationId = table.Column<Guid>( type: "TEXT", nullable: false),
                    ProductId = table.Column<Guid>( type: "TEXT", nullable: false),
                    ClosingStock = table.Column<decimal>(type: "TEXT", nullable: false),
                    DailyStockDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    LastUpdateDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    OpeningStock = table.Column<decimal>(type: "TEXT", nullable: false),
                    QuantityAdjusted = table.Column<decimal>(type: "TEXT", nullable: false),
                    QuantityDamaged = table.Column<decimal>(type: "TEXT", nullable: false),
                    QuantityFromTransfter = table.Column<decimal>(type: "TEXT", nullable: false),
                    QuantityPurchased = table.Column<decimal>(type: "TEXT", nullable: false),
                    QuantityPurchasedReturned = table.Column<decimal>(type: "TEXT", nullable: false),
                    QuantitySold = table.Column<decimal>(type: "TEXT", nullable: false),
                    QuantitySoldReturned = table.Column<decimal>(type: "TEXT", nullable: false),
                    QuantityToTransfter = table.Column<decimal>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyStocks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DailyStocks_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DailyStocks_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Inventories",
                columns: table => new
                {
                    Id = table.Column<Guid>( type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>( type: "TEXT", nullable: false),
                    LocationId = table.Column<Guid>( type: "TEXT", nullable: false),
                    ProductId = table.Column<Guid>( type: "TEXT", nullable: false),
                    AveragePurchasePrice = table.Column<decimal>(type: "TEXT", nullable: false),
                    AverageSalesPrice = table.Column<decimal>(type: "TEXT", nullable: false),
                    CreatedDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    DeletedBy = table.Column<Guid>( type: "TEXT", nullable: true),
                    DeletedDate = table.Column<DateTime>( type: "TEXT", nullable: true),
                    IsDeleted = table.Column<bool>( type: "INTEGER", nullable: false),
                    ModifiedBy = table.Column<Guid>( type: "TEXT", nullable: false),
                    ModifiedDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    Stock = table.Column<decimal>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Inventories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Inventories_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Inventories_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Inventories_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "InventoryHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>( type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>( type: "TEXT", nullable: false),
                    DamagedStockId = table.Column<Guid>( type: "TEXT", nullable: true),
                    LocationId = table.Column<Guid>( type: "TEXT", nullable: false),
                    ProductId = table.Column<Guid>( type: "TEXT", nullable: false),
                    PurchaseOrderId = table.Column<Guid>( type: "TEXT", nullable: true),
                    SalesOrderId = table.Column<Guid>( type: "TEXT", nullable: true),
                    StockTransferId = table.Column<Guid>( type: "TEXT", nullable: true),
                    CreatedDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    DeletedBy = table.Column<Guid>( type: "TEXT", nullable: true),
                    DeletedDate = table.Column<DateTime>( type: "TEXT", nullable: true),
                    InventorySource = table.Column<int>(type: "INTEGER", nullable: false),
                    IsDeleted = table.Column<bool>( type: "INTEGER", nullable: false),
                    ModifiedBy = table.Column<Guid>( type: "TEXT", nullable: false),
                    ModifiedDate = table.Column<DateTime>( type: "TEXT", nullable: false),
                    PreviousTotalStock = table.Column<decimal>(type: "TEXT", nullable: false),
                    PricePerUnit = table.Column<decimal>(type: "TEXT", nullable: false),
                    Stock = table.Column<decimal>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryHistories_DamagedStocks_DamagedStockId",
                        column: x => x.DamagedStockId,
                        principalTable: "DamagedStocks",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InventoryHistories_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InventoryHistories_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InventoryHistories_PurchaseOrders_PurchaseOrderId",
                        column: x => x.PurchaseOrderId,
                        principalTable: "PurchaseOrders",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InventoryHistories_SalesOrders_SalesOrderId",
                        column: x => x.SalesOrderId,
                        principalTable: "SalesOrders",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InventoryHistories_StockTransfers_StockTransferId",
                        column: x => x.StockTransferId,
                        principalTable: "StockTransfers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InventoryHistories_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DailyStocks_LocationId",
                table: "DailyStocks",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyStocks_ProductId",
                table: "DailyStocks",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Inventories_CreatedBy",
                table: "Inventories",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Inventories_LocationId",
                table: "Inventories",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_Inventories_ProductId",
                table: "Inventories",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryHistories_CreatedBy",
                table: "InventoryHistories",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryHistories_DamagedStockId",
                table: "InventoryHistories",
                column: "DamagedStockId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryHistories_LocationId",
                table: "InventoryHistories",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryHistories_ProductId",
                table: "InventoryHistories",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryHistories_PurchaseOrderId",
                table: "InventoryHistories",
                column: "PurchaseOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryHistories_SalesOrderId",
                table: "InventoryHistories",
                column: "SalesOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryHistories_StockTransferId",
                table: "InventoryHistories",
                column: "StockTransferId");
        }
    }
}





