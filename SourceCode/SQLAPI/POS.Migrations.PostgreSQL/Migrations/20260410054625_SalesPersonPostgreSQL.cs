using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace POS.Migrations.PostgreSQL.Migrations
{
    /// <inheritdoc />
    public partial class SalesPersonPostgreSQL : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SalesPersonId",
                table: "SalesOrders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SalesPersonId",
                table: "PurchaseOrders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LocationId",
                table: "Customers",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SalesPersonId",
                table: "Customers",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrders_SalesPersonId",
                table: "SalesOrders",
                column: "SalesPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_SalesPersonId",
                table: "PurchaseOrders",
                column: "SalesPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_LocationId",
                table: "Customers",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_SalesPersonId",
                table: "Customers",
                column: "SalesPersonId");

            migrationBuilder.AddForeignKey(
                name: "FK_Customers_Locations_LocationId",
                table: "Customers",
                column: "LocationId",
                principalTable: "Locations",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Customers_Users_SalesPersonId",
                table: "Customers",
                column: "SalesPersonId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseOrders_Users_SalesPersonId",
                table: "PurchaseOrders",
                column: "SalesPersonId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_SalesOrders_Users_SalesPersonId",
                table: "SalesOrders",
                column: "SalesPersonId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Customers_Locations_LocationId",
                table: "Customers");

            migrationBuilder.DropForeignKey(
                name: "FK_Customers_Users_SalesPersonId",
                table: "Customers");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseOrders_Users_SalesPersonId",
                table: "PurchaseOrders");

            migrationBuilder.DropForeignKey(
                name: "FK_SalesOrders_Users_SalesPersonId",
                table: "SalesOrders");

            migrationBuilder.DropIndex(
                name: "IX_SalesOrders_SalesPersonId",
                table: "SalesOrders");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrders_SalesPersonId",
                table: "PurchaseOrders");

            migrationBuilder.DropIndex(
                name: "IX_Customers_LocationId",
                table: "Customers");

            migrationBuilder.DropIndex(
                name: "IX_Customers_SalesPersonId",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "SalesPersonId",
                table: "SalesOrders");

            migrationBuilder.DropColumn(
                name: "SalesPersonId",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "LocationId",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "SalesPersonId",
                table: "Customers");
        }
    }
}
