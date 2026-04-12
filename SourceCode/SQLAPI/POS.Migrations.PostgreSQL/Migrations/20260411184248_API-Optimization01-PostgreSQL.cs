using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace POS.Migrations.PostgreSQL.Migrations
{
    /// <inheritdoc />
    public partial class APIOptimization01PostgreSQL : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ReminderScheduler_TenantId",
                table: "ReminderSchedulers");

            migrationBuilder.CreateIndex(
                name: "IX_Transaction_Date_Type_Branch",
                table: "Transactions",
                columns: new[] { "TenantId", "TransactionDate", "TransactionType", "BranchId" });

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrder_Date_Location_IsRequest",
                table: "SalesOrders",
                columns: new[] { "TenantId", "SOCreatedDate", "LocationId", "IsSalesOrderRequest" });

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrder_DeliveryDate_Status",
                table: "SalesOrders",
                columns: new[] { "TenantId", "DeliveryDate", "DeliveryStatus" });

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrderItem_Product_Status",
                table: "SalesOrderItems",
                columns: new[] { "ProductId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ReminderScheduler_User_Read_Active",
                table: "ReminderSchedulers",
                columns: new[] { "TenantId", "UserId", "IsRead", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrder_Date_Location_IsRequest",
                table: "PurchaseOrders",
                columns: new[] { "TenantId", "POCreatedDate", "LocationId", "IsPurchaseOrderRequest" });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrder_DeliveryDate_Status",
                table: "PurchaseOrders",
                columns: new[] { "TenantId", "DeliveryDate", "DeliveryStatus" });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderItem_Product_Status",
                table: "PurchaseOrderItems",
                columns: new[] { "ProductId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Transaction_Date_Type_Branch",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_SalesOrder_Date_Location_IsRequest",
                table: "SalesOrders");

            migrationBuilder.DropIndex(
                name: "IX_SalesOrder_DeliveryDate_Status",
                table: "SalesOrders");

            migrationBuilder.DropIndex(
                name: "IX_SalesOrderItem_Product_Status",
                table: "SalesOrderItems");

            migrationBuilder.DropIndex(
                name: "IX_ReminderScheduler_User_Read_Active",
                table: "ReminderSchedulers");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrder_Date_Location_IsRequest",
                table: "PurchaseOrders");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrder_DeliveryDate_Status",
                table: "PurchaseOrders");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrderItem_Product_Status",
                table: "PurchaseOrderItems");

            migrationBuilder.CreateIndex(
                name: "IX_ReminderScheduler_TenantId",
                table: "ReminderSchedulers",
                column: "TenantId");
        }
    }
}
