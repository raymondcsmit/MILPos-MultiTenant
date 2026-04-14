using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace POS.Migrations.PostgreSQL.Migrations
{
    /// <inheritdoc />
    public partial class OptimizationPostgreSQL : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameIndex(
                name: "IX_TransactionItems_TransactionId",
                table: "TransactionItems",
                newName: "IX_TransactionItem_Transaction");

            migrationBuilder.RenameIndex(
                name: "IX_SalesOrderItems_ProductId",
                table: "SalesOrderItems",
                newName: "IX_SalesOrderItem_Product");

            migrationBuilder.RenameIndex(
                name: "IX_PurchaseOrderItems_PurchaseOrderId",
                table: "PurchaseOrderItems",
                newName: "IX_PurchaseOrderItem_PurchaseOrder");

            migrationBuilder.RenameIndex(
                name: "IX_PurchaseOrderItems_ProductId",
                table: "PurchaseOrderItems",
                newName: "IX_PurchaseOrderItem_Product");

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrder_Tenant_IsDeleted_Date",
                table: "SalesOrders",
                columns: new[] { "TenantId", "IsDeleted", "SOCreatedDate" });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrder_Tenant_IsDeleted_Date",
                table: "PurchaseOrders",
                columns: new[] { "TenantId", "IsDeleted", "POCreatedDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Product_Tenant_IsDeleted",
                table: "Products",
                columns: new[] { "TenantId", "IsDeleted" });

            migrationBuilder.CreateIndex(
                name: "IX_ProductCategory_Tenant_IsDeleted",
                table: "ProductCategories",
                columns: new[] { "TenantId", "IsDeleted" });

            migrationBuilder.CreateIndex(
                name: "IX_Expense_Tenant_IsDeleted_Date",
                table: "Expenses",
                columns: new[] { "TenantId", "IsDeleted", "ExpenseDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SalesOrder_Tenant_IsDeleted_Date",
                table: "SalesOrders");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrder_Tenant_IsDeleted_Date",
                table: "PurchaseOrders");

            migrationBuilder.DropIndex(
                name: "IX_Product_Tenant_IsDeleted",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_ProductCategory_Tenant_IsDeleted",
                table: "ProductCategories");

            migrationBuilder.DropIndex(
                name: "IX_Expense_Tenant_IsDeleted_Date",
                table: "Expenses");

            migrationBuilder.RenameIndex(
                name: "IX_TransactionItem_Transaction",
                table: "TransactionItems",
                newName: "IX_TransactionItems_TransactionId");

            migrationBuilder.RenameIndex(
                name: "IX_SalesOrderItem_Product",
                table: "SalesOrderItems",
                newName: "IX_SalesOrderItems_ProductId");

            migrationBuilder.RenameIndex(
                name: "IX_PurchaseOrderItem_PurchaseOrder",
                table: "PurchaseOrderItems",
                newName: "IX_PurchaseOrderItems_PurchaseOrderId");

            migrationBuilder.RenameIndex(
                name: "IX_PurchaseOrderItem_Product",
                table: "PurchaseOrderItems",
                newName: "IX_PurchaseOrderItems_ProductId");
        }
    }
}
