using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace POS.Migrations.PostgreSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddApiKeyToTenant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ApiKey",
                table: "Tenants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ApiKeyCreatedDate",
                table: "Tenants",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ApiKeyEnabled",
                table: "Tenants",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ApiKeyLastUsedDate",
                table: "Tenants",
                type: "timestamp without time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApiKey",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "ApiKeyCreatedDate",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "ApiKeyEnabled",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "ApiKeyLastUsedDate",
                table: "Tenants");
        }
    }
}
