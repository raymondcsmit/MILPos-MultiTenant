using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace POS.Domain.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ContactAddresses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ContactPerson = table.Column<string>(type: "TEXT", nullable: true),
                    MobileNo = table.Column<string>(type: "TEXT",  nullable: true),
                    Address = table.Column<string>(type: "TEXT",  nullable: true),
                    CountryName = table.Column<string>(type: "TEXT",  nullable: true),
                    CityName = table.Column<string>(type: "TEXT",  nullable: true),
                    CountryId = table.Column<Guid>(type: "TEXT",  nullable: true),
                    CityId = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContactAddresses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Currencies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Name = table.Column<string>(type: "TEXT",  nullable: true),
                    Symbol = table.Column<string>(type: "TEXT",  nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Currencies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EmailLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    SenderEmail = table.Column<string>(type: "TEXT",  nullable: true),
                    RecipientEmail = table.Column<string>(type: "TEXT",  nullable: true),
                    Subject = table.Column<string>(type: "TEXT",  nullable: true),
                    Body = table.Column<string>(type: "TEXT",  nullable: true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    ErrorMessage = table.Column<string>(type: "TEXT",  nullable: true),
                    SentAt = table.Column<DateTime>(type: "TEXT",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LoginAudits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    UserName = table.Column<string>(type: "TEXT",  nullable: true),
                    LoginTime = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    RemoteIP = table.Column<string>(type: "TEXT",  maxLength: 50, nullable: true),
                    Status = table.Column<string>(type: "TEXT",  nullable: true),
                    Provider = table.Column<string>(type: "TEXT",  nullable: true),
                    Latitude = table.Column<string>(type: "TEXT",  maxLength: 50, nullable: true),
                    Longitude = table.Column<string>(type: "TEXT",  maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoginAudits", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NLog",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    MachineName = table.Column<string>(type: "TEXT",  nullable: true),
                    Logged = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    Level = table.Column<string>(type: "TEXT",  nullable: true),
                    Message = table.Column<string>(type: "TEXT",  nullable: true),
                    Logger = table.Column<string>(type: "TEXT",  nullable: true),
                    Properties = table.Column<string>(type: "TEXT",  nullable: true),
                    Callsite = table.Column<string>(type: "TEXT",  nullable: true),
                    Exception = table.Column<string>(type: "TEXT",  nullable: true),
                    Source = table.Column<string>(type: "TEXT",  maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NLog", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TableSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ScreenName = table.Column<string>(type: "TEXT",  nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    SettingsJson = table.Column<string>(type: "TEXT",  nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TableSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    FirstName = table.Column<string>(type: "TEXT",  nullable: true),
                    LastName = table.Column<string>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER",  nullable: false),
                    ProfilePhoto = table.Column<string>(type: "TEXT",  nullable: true),
                    Provider = table.Column<string>(type: "TEXT",  nullable: true),
                    Address = table.Column<string>(type: "TEXT",  nullable: true),
                    IsSuperAdmin = table.Column<bool>(type: "INTEGER",  nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsAllLocations = table.Column<bool>(type: "INTEGER",  nullable: false),
                    ResetPasswordCode = table.Column<string>(type: "TEXT",  nullable: true),
                    UserName = table.Column<string>(type: "TEXT",  maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "TEXT",  maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "TEXT",  maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "TEXT",  maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "INTEGER",  nullable: false),
                    PasswordHash = table.Column<string>(type: "TEXT",  nullable: true),
                    SecurityStamp = table.Column<string>(type: "TEXT",  nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "TEXT",  nullable: true),
                    PhoneNumber = table.Column<string>(type: "TEXT",  nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "INTEGER",  nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "INTEGER",  nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>( nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "INTEGER",  nullable: false),
                    AccessFailedCount = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EmailLogAttachments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    EmailLogId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Path = table.Column<string>(type: "TEXT",  nullable: true),
                    Name = table.Column<string>(type: "TEXT",  nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailLogAttachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmailLogAttachments_EmailLogs_EmailLogId",
                        column: x => x.EmailLogId,
                        principalTable: "EmailLogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Brands",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Name = table.Column<string>(type: "TEXT",  nullable: true),
                    ImageUrl = table.Column<string>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Brands", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Brands_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CompanyProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Title = table.Column<string>(type: "TEXT",  nullable: true),
                    Address = table.Column<string>(type: "TEXT",  nullable: true),
                    LogoUrl = table.Column<string>(type: "TEXT",  nullable: true),
                    Phone = table.Column<string>(type: "TEXT",  nullable: true),
                    Email = table.Column<string>(type: "TEXT",  nullable: true),
                    TaxName = table.Column<string>(type: "TEXT",  nullable: true),
                    TaxNumber = table.Column<string>(type: "TEXT",  nullable: true),
                    CurrencyCode = table.Column<string>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CompanyProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CompanyProfiles_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ContactRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Name = table.Column<string>(type: "TEXT",  nullable: true),
                    Email = table.Column<string>(type: "TEXT",  nullable: true),
                    Phone = table.Column<string>(type: "TEXT",  nullable: true),
                    Message = table.Column<string>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContactRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContactRequests_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Countries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    CountryName = table.Column<string>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Countries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Countries_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Customers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    CustomerName = table.Column<string>(type: "TEXT",  nullable: true),
                    ContactPerson = table.Column<string>(type: "TEXT",  nullable: true),
                    Email = table.Column<string>(type: "TEXT",  nullable: true),
                    Fax = table.Column<string>(type: "TEXT",  nullable: true),
                    MobileNo = table.Column<string>(type: "TEXT",  nullable: true),
                    PhoneNo = table.Column<string>(type: "TEXT",  nullable: true),
                    Website = table.Column<string>(type: "TEXT",  nullable: true),
                    Description = table.Column<string>(type: "TEXT",  nullable: true),
                    Url = table.Column<string>(type: "TEXT",  nullable: true),
                    BillingAddressId = table.Column<Guid>(type: "TEXT",  nullable: true),
                    ShippingAddressId = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsWalkIn = table.Column<bool>(type: "INTEGER",  nullable: false),
                    TaxNumber = table.Column<string>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Customers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Customers_ContactAddresses_BillingAddressId",
                        column: x => x.BillingAddressId,
                        principalTable: "ContactAddresses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Customers_ContactAddresses_ShippingAddressId",
                        column: x => x.ShippingAddressId,
                        principalTable: "ContactAddresses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Customers_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EmailSMTPSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Host = table.Column<string>(type: "TEXT",  nullable: false),
                    UserName = table.Column<string>(type: "TEXT",  nullable: false),
                    Password = table.Column<string>(type: "TEXT",  nullable: false),
                    Port = table.Column<int>(type: "INTEGER", nullable: false),
                    IsDefault = table.Column<bool>(type: "INTEGER",  nullable: false),
                    EncryptionType = table.Column<string>(type: "TEXT",  nullable: true),
                    FromEmail = table.Column<string>(type: "TEXT",  nullable: true),
                    FromName = table.Column<string>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailSMTPSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmailSMTPSettings_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EmailTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Name = table.Column<string>(type: "TEXT",  nullable: true),
                    Subject = table.Column<string>(type: "TEXT",  nullable: true),
                    Body = table.Column<string>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmailTemplates_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ExpenseCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Name = table.Column<string>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExpenseCategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExpenseCategories_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "InquirySources",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Name = table.Column<string>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InquirySources", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InquirySources_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "InquiryStatuses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Name = table.Column<string>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InquiryStatuses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InquiryStatuses_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Languages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Name = table.Column<string>(type: "TEXT",  nullable: true),
                    Code = table.Column<string>(type: "TEXT",  nullable: true),
                    ImageUrl = table.Column<string>(type: "TEXT",  nullable: true),
                    Isrtl = table.Column<bool>(type: "INTEGER",  nullable: false),
                    Order = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Languages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Languages_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Locations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Name = table.Column<string>(type: "TEXT",  nullable: true),
                    Address = table.Column<string>(type: "TEXT",  nullable: true),
                    Email = table.Column<string>(type: "TEXT",  nullable: true),
                    Mobile = table.Column<string>(type: "TEXT",  nullable: true),
                    ContactPerson = table.Column<string>(type: "TEXT",  nullable: true),
                    Website = table.Column<string>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Locations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Locations_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Pagehelpers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Code = table.Column<string>(type: "TEXT",  nullable: true),
                    Name = table.Column<string>(type: "TEXT",  nullable: true),
                    Description = table.Column<string>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pagehelpers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Pagehelpers_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Pages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Name = table.Column<string>(type: "TEXT",  nullable: true),
                    Order = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Pages_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProductCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Name = table.Column<string>(type: "TEXT",  nullable: true),
                    ParentId = table.Column<Guid>(type: "TEXT",  nullable: true),
                    Description = table.Column<string>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductCategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductCategories_ProductCategories_ParentId",
                        column: x => x.ParentId,
                        principalTable: "ProductCategories",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProductCategories_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Reminders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Subject = table.Column<string>(type: "TEXT",  nullable: true),
                    Message = table.Column<string>(type: "TEXT",  nullable: true),
                    Frequency = table.Column<int>(type: "INTEGER", nullable: true),
                    StartDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    EndDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DayOfWeek = table.Column<int>(type: "INTEGER", nullable: true),
                    IsRepeated = table.Column<bool>(type: "INTEGER",  nullable: false),
                    IsEmailNotification = table.Column<bool>(type: "INTEGER",  nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reminders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Reminders_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ReminderSchedulers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Duration = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER",  nullable: false),
                    Frequency = table.Column<int>(type: "INTEGER", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    IsRead = table.Column<bool>(type: "INTEGER",  nullable: false),
                    IsEmailNotification = table.Column<bool>(type: "INTEGER",  nullable: false),
                    Subject = table.Column<string>(type: "TEXT",  nullable: true),
                    Message = table.Column<string>(type: "TEXT",  nullable: true),
                    ReferenceId = table.Column<Guid>(type: "TEXT",  nullable: true),
                    Application = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReminderSchedulers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReminderSchedulers_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsSuperRole = table.Column<bool>(type: "INTEGER",  nullable: false),
                    Name = table.Column<string>(type: "TEXT",  maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "TEXT",  maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "TEXT",  nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Roles_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Roles_Users_DeletedBy",
                        column: x => x.DeletedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Roles_Users_ModifiedBy",
                        column: x => x.ModifiedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Taxes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Name = table.Column<string>(type: "TEXT",  nullable: true),
                    Percentage = table.Column<decimal>(type: "TEXT", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Taxes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Taxes_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UnitConversations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Name = table.Column<string>(type: "TEXT",  nullable: true),
                    Code = table.Column<string>(type: "TEXT",  nullable: true),
                    Operator = table.Column<int>(type: "INTEGER", nullable: true),
                    Value = table.Column<decimal>(type: "TEXT", nullable: true),
                    ParentId = table.Column<Guid>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UnitConversations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UnitConversations_UnitConversations_ParentId",
                        column: x => x.ParentId,
                        principalTable: "UnitConversations",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_UnitConversations_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "TEXT",  nullable: false),
                    ProviderKey = table.Column<string>(type: "TEXT",  nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "TEXT",  nullable: true),
                    UserId = table.Column<Guid>(type: "TEXT",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_UserLogins_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserTokens",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    LoginProvider = table.Column<string>(type: "TEXT",  nullable: false),
                    Name = table.Column<string>(type: "TEXT",  nullable: false),
                    Value = table.Column<string>(type: "TEXT",  nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_UserTokens_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Variants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Name = table.Column<string>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Variants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Variants_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Cities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    CityName = table.Column<string>(type: "TEXT",  nullable: true),
                    CountryId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Cities_Countries_CountryId",
                        column: x => x.CountryId,
                        principalTable: "Countries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Cities_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Expenses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Reference = table.Column<string>(type: "TEXT",  nullable: true),
                    ExpenseCategoryId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Amount = table.Column<decimal>(type: "TEXT", nullable: false),
                    ExpenseById = table.Column<Guid>(type: "TEXT",  nullable: true),
                    Description = table.Column<string>(type: "TEXT",  nullable: true),
                    ExpenseDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ReceiptName = table.Column<string>(type: "TEXT",  nullable: true),
                    ReceiptPath = table.Column<string>(type: "TEXT",  nullable: true),
                    TotalTax = table.Column<decimal>(type: "TEXT", nullable: false),
                    LocationId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Expenses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Expenses_ExpenseCategories_ExpenseCategoryId",
                        column: x => x.ExpenseCategoryId,
                        principalTable: "ExpenseCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Expenses_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Expenses_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Expenses_Users_ExpenseById",
                        column: x => x.ExpenseById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SalesOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    OrderNumber = table.Column<string>(type: "TEXT",  nullable: true),
                    Note = table.Column<string>(type: "TEXT",  nullable: true),
                    SaleReturnNote = table.Column<string>(type: "TEXT",  nullable: true),
                    TermAndCondition = table.Column<string>(type: "TEXT",  nullable: true),
                    IsSalesOrderRequest = table.Column<bool>(type: "INTEGER",  nullable: false),
                    SOCreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    DeliveryDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    DeliveryStatus = table.Column<int>(type: "INTEGER", nullable: false),
                    CustomerId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    TotalAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    TotalTax = table.Column<decimal>(type: "TEXT", nullable: false),
                    TotalDiscount = table.Column<decimal>(type: "TEXT", nullable: false),
                    TotalPaidAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    PaymentStatus = table.Column<int>(type: "INTEGER", nullable: false),
                    LocationId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalesOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SalesOrders_Customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SalesOrders_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SalesOrders_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "StockTransfers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    TransferDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ReferenceNo = table.Column<string>(type: "TEXT",  nullable: true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    FromLocationId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ToLocationId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    TotalShippingCharge = table.Column<decimal>(type: "TEXT", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    Notes = table.Column<string>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockTransfers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StockTransfers_Locations_FromLocationId",
                        column: x => x.FromLocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StockTransfers_Locations_ToLocationId",
                        column: x => x.ToLocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StockTransfers_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserLocations",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    LocationId = table.Column<Guid>(type: "TEXT",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserLocations", x => new { x.UserId, x.LocationId });
                    table.ForeignKey(
                        name: "FK_UserLocations_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserLocations_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Actions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Name = table.Column<string>(type: "TEXT",  nullable: true),
                    Order = table.Column<int>(type: "INTEGER", nullable: false),
                    PageId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Code = table.Column<string>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Actions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Actions_Pages_PageId",
                        column: x => x.PageId,
                        principalTable: "Pages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Actions_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DailyReminders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ReminderId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DayOfWeek = table.Column<int>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyReminders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DailyReminders_Reminders_ReminderId",
                        column: x => x.ReminderId,
                        principalTable: "Reminders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HalfYearlyReminders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ReminderId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Day = table.Column<int>(type: "INTEGER", nullable: false),
                    Month = table.Column<int>(type: "INTEGER", nullable: false),
                    Quarter = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HalfYearlyReminders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HalfYearlyReminders_Reminders_ReminderId",
                        column: x => x.ReminderId,
                        principalTable: "Reminders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "QuarterlyReminders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ReminderId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Day = table.Column<int>(type: "INTEGER", nullable: false),
                    Month = table.Column<int>(type: "INTEGER", nullable: false),
                    Quarter = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuarterlyReminders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuarterlyReminders_Reminders_ReminderId",
                        column: x => x.ReminderId,
                        principalTable: "Reminders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReminderNotifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ReminderId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Subject = table.Column<string>(type: "TEXT",  nullable: true),
                    Description = table.Column<string>(type: "TEXT",  nullable: true),
                    FetchDateTime = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false),
                    IsEmailNotification = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReminderNotifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReminderNotifications_Reminders_ReminderId",
                        column: x => x.ReminderId,
                        principalTable: "Reminders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReminderUsers",
                columns: table => new
                {
                    ReminderId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReminderUsers", x => new { x.ReminderId, x.UserId });
                    table.ForeignKey(
                        name: "FK_ReminderUsers_Reminders_ReminderId",
                        column: x => x.ReminderId,
                        principalTable: "Reminders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReminderUsers_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "UserRoles",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    RoleId = table.Column<Guid>(type: "TEXT",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_UserRoles_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserRoles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VariantItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Name = table.Column<string>(type: "TEXT",  nullable: true),
                    VariantId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VariantItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VariantItems_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VariantItems_Variants_VariantId",
                        column: x => x.VariantId,
                        principalTable: "Variants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Inquiries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    CompanyName = table.Column<string>(type: "TEXT",  nullable: true),
                    ContactPerson = table.Column<string>(type: "TEXT",  maxLength: 100, nullable: true),
                    Email = table.Column<string>(type: "TEXT",  maxLength: 50, nullable: true),
                    Phone = table.Column<string>(type: "TEXT",  nullable: true),
                    MobileNo = table.Column<string>(type: "TEXT",  nullable: true),
                    Address = table.Column<string>(type: "TEXT",  nullable: true),
                    Message = table.Column<string>(type: "TEXT",  nullable: true),
                    CityName = table.Column<string>(type: "TEXT",  nullable: true),
                    Website = table.Column<string>(type: "TEXT",  nullable: true),
                    CountryName = table.Column<string>(type: "TEXT",  nullable: true),
                    CityId = table.Column<Guid>(type: "TEXT",  nullable: true),
                    CountryId = table.Column<Guid>(type: "TEXT",  nullable: true),
                    AssignTo = table.Column<Guid>(type: "TEXT",  nullable: true),
                    InquiryStatusId = table.Column<Guid>(type: "TEXT",  nullable: true),
                    InquirySourceId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Inquiries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Inquiries_Cities_CityId",
                        column: x => x.CityId,
                        principalTable: "Cities",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Inquiries_Countries_CountryId",
                        column: x => x.CountryId,
                        principalTable: "Countries",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Inquiries_InquirySources_InquirySourceId",
                        column: x => x.InquirySourceId,
                        principalTable: "InquirySources",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Inquiries_InquiryStatuses_InquiryStatusId",
                        column: x => x.InquiryStatusId,
                        principalTable: "InquiryStatuses",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Inquiries_Users_AssignTo",
                        column: x => x.AssignTo,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Inquiries_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SupplierAddresses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Address = table.Column<string>(type: "TEXT",  nullable: true),
                    CountryName = table.Column<string>(type: "TEXT",  nullable: true),
                    CityName = table.Column<string>(type: "TEXT",  nullable: true),
                    CountryId = table.Column<Guid>(type: "TEXT",  nullable: true),
                    CityId = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupplierAddresses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupplierAddresses_Cities_CityId",
                        column: x => x.CityId,
                        principalTable: "Cities",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SupplierAddresses_Countries_CountryId",
                        column: x => x.CountryId,
                        principalTable: "Countries",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ExpenseTaxes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ExpenseId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    TaxId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    TaxValue = table.Column<decimal>(type: "TEXT", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExpenseTaxes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExpenseTaxes_Expenses_ExpenseId",
                        column: x => x.ExpenseId,
                        principalTable: "Expenses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ExpenseTaxes_Taxes_TaxId",
                        column: x => x.TaxId,
                        principalTable: "Taxes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ExpenseTaxes_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SalesOrderPayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    SalesOrderId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    PaymentDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ReferenceNumber = table.Column<string>(type: "TEXT",  nullable: true),
                    Amount = table.Column<decimal>(type: "TEXT", nullable: false),
                    PaymentMethod = table.Column<int>(type: "INTEGER", nullable: false),
                    Note = table.Column<string>(type: "TEXT",  nullable: true),
                    AttachmentUrl = table.Column<string>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalesOrderPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SalesOrderPayments_SalesOrders_SalesOrderId",
                        column: x => x.SalesOrderId,
                        principalTable: "SalesOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SalesOrderPayments_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ActionId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    RoleId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ClaimType = table.Column<string>(type: "TEXT",  nullable: true),
                    ClaimValue = table.Column<string>(type: "TEXT",  nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RoleClaims_Actions_ActionId",
                        column: x => x.ActionId,
                        principalTable: "Actions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RoleClaims_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ActionId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ClaimType = table.Column<string>(type: "TEXT",  nullable: true),
                    ClaimValue = table.Column<string>(type: "TEXT",  nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserClaims_Actions_ActionId",
                        column: x => x.ActionId,
                        principalTable: "Actions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserClaims_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Products",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Name = table.Column<string>(type: "TEXT",  nullable: true),
                    Code = table.Column<string>(type: "TEXT",  nullable: true),
                    Barcode = table.Column<string>(type: "TEXT",  nullable: true),
                    SkuCode = table.Column<string>(type: "TEXT",  nullable: true),
                    SkuName = table.Column<string>(type: "TEXT",  nullable: true),
                    Description = table.Column<string>(type: "TEXT",  nullable: true),
                    ProductUrl = table.Column<string>(type: "TEXT",  nullable: true),
                    UnitId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    PurchasePrice = table.Column<decimal>(type: "TEXT", nullable: true),
                    Margin = table.Column<decimal>(type: "TEXT", nullable: false),
                    IsMarginIncludeTax = table.Column<bool>(type: "INTEGER",  nullable: false),
                    SalesPrice = table.Column<decimal>(type: "TEXT", nullable: true),
                    Mrp = table.Column<decimal>(type: "TEXT", nullable: true),
                    CategoryId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    BrandId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    HasVariant = table.Column<bool>(type: "INTEGER",  nullable: false),
                    ParentId = table.Column<Guid>(type: "TEXT",  nullable: true),
                    VariantId = table.Column<Guid>(type: "TEXT",  nullable: true),
                    VariantItemId = table.Column<Guid>(type: "TEXT",  nullable: true),
                    AlertQuantity = table.Column<decimal>(type: "TEXT", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Products", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Products_Brands_BrandId",
                        column: x => x.BrandId,
                        principalTable: "Brands",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Products_ProductCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "ProductCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Products_Products_ParentId",
                        column: x => x.ParentId,
                        principalTable: "Products",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Products_UnitConversations_UnitId",
                        column: x => x.UnitId,
                        principalTable: "UnitConversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Products_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Products_VariantItems_VariantItemId",
                        column: x => x.VariantItemId,
                        principalTable: "VariantItems",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Products_Variants_VariantId",
                        column: x => x.VariantId,
                        principalTable: "Variants",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "InquiryActivities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Subject = table.Column<string>(type: "TEXT",  nullable: true),
                    Description = table.Column<string>(type: "TEXT",  nullable: true),
                    DueDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    IsOpen = table.Column<bool>(type: "INTEGER",  nullable: false),
                    AssignTo = table.Column<Guid>(type: "TEXT",  nullable: true),
                    Priority = table.Column<string>(type: "TEXT",  nullable: true),
                    InquiryId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InquiryActivities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InquiryActivities_Inquiries_InquiryId",
                        column: x => x.InquiryId,
                        principalTable: "Inquiries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_InquiryActivities_Users_AssignTo",
                        column: x => x.AssignTo,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InquiryActivities_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "InquiryAttachments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    InquiryId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Path = table.Column<string>(type: "TEXT",  nullable: true),
                    Name = table.Column<string>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InquiryAttachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InquiryAttachments_Inquiries_InquiryId",
                        column: x => x.InquiryId,
                        principalTable: "Inquiries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_InquiryAttachments_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "InquiryNotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    InquiryId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Note = table.Column<string>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InquiryNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InquiryNotes_Inquiries_InquiryId",
                        column: x => x.InquiryId,
                        principalTable: "Inquiries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_InquiryNotes_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Suppliers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    SupplierName = table.Column<string>(type: "TEXT",  nullable: true),
                    ContactPerson = table.Column<string>(type: "TEXT",  nullable: true),
                    Email = table.Column<string>(type: "TEXT",  nullable: true),
                    Fax = table.Column<string>(type: "TEXT",  nullable: true),
                    MobileNo = table.Column<string>(type: "TEXT",  nullable: true),
                    PhoneNo = table.Column<string>(type: "TEXT",  nullable: true),
                    Website = table.Column<string>(type: "TEXT",  nullable: true),
                    Description = table.Column<string>(type: "TEXT",  nullable: true),
                    Url = table.Column<string>(type: "TEXT",  nullable: true),
                    BillingAddressId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ShippingAddressId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    TaxNumber = table.Column<string>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Suppliers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Suppliers_SupplierAddresses_BillingAddressId",
                        column: x => x.BillingAddressId,
                        principalTable: "SupplierAddresses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Suppliers_SupplierAddresses_ShippingAddressId",
                        column: x => x.ShippingAddressId,
                        principalTable: "SupplierAddresses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Suppliers_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DailyStocks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ProductId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    OpeningStock = table.Column<decimal>(type: "TEXT", nullable: false),
                    ClosingStock = table.Column<decimal>(type: "TEXT", nullable: false),
                    QuantitySold = table.Column<decimal>(type: "TEXT", nullable: false),
                    QuantityPurchased = table.Column<decimal>(type: "TEXT", nullable: false),
                    QuantityDamaged = table.Column<decimal>(type: "TEXT", nullable: false),
                    QuantitySoldReturned = table.Column<decimal>(type: "TEXT", nullable: false),
                    QuantityPurchasedReturned = table.Column<decimal>(type: "TEXT", nullable: false),
                    QuantityAdjusted = table.Column<decimal>(type: "TEXT", nullable: false),
                    QuantityToTransfter = table.Column<decimal>(type: "TEXT", nullable: false),
                    QuantityFromTransfter = table.Column<decimal>(type: "TEXT", nullable: false),
                    DailyStockDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    LastUpdateDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    LocationId = table.Column<Guid>(type: "TEXT",  nullable: false)
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
                name: "DamagedStocks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ProductId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DamagedQuantity = table.Column<decimal>(type: "TEXT", nullable: false),
                    Reason = table.Column<string>(type: "TEXT",  nullable: true),
                    ReportedId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DamagedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    LocationId = table.Column<Guid>(type: "TEXT",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DamagedStocks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DamagedStocks_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DamagedStocks_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DamagedStocks_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DamagedStocks_Users_ReportedId",
                        column: x => x.ReportedId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "InquiryProducts",
                columns: table => new
                {
                    ProductId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    InquiryId = table.Column<Guid>(type: "TEXT",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InquiryProducts", x => new { x.ProductId, x.InquiryId });
                    table.ForeignKey(
                        name: "FK_InquiryProducts_Inquiries_InquiryId",
                        column: x => x.InquiryId,
                        principalTable: "Inquiries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InquiryProducts_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Inventories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ProductId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Stock = table.Column<decimal>(type: "TEXT", nullable: false),
                    AveragePurchasePrice = table.Column<decimal>(type: "TEXT", nullable: false),
                    AverageSalesPrice = table.Column<decimal>(type: "TEXT", nullable: false),
                    LocationId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
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
                name: "ProductTaxes",
                columns: table => new
                {
                    ProductId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    TaxId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductTaxes", x => new { x.ProductId, x.TaxId });
                    table.ForeignKey(
                        name: "FK_ProductTaxes_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductTaxes_Taxes_TaxId",
                        column: x => x.TaxId,
                        principalTable: "Taxes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductTaxes_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SalesOrderItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ProductId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    SalesOrderId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    UnitPrice = table.Column<decimal>(type: "TEXT", nullable: false),
                    Quantity = table.Column<decimal>(type: "TEXT", nullable: false),
                    TaxValue = table.Column<decimal>(type: "TEXT", nullable: false),
                    Discount = table.Column<decimal>(type: "TEXT", nullable: false),
                    DiscountPercentage = table.Column<decimal>(type: "TEXT", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    UnitId = table.Column<Guid>(type: "TEXT",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalesOrderItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SalesOrderItems_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SalesOrderItems_SalesOrders_SalesOrderId",
                        column: x => x.SalesOrderId,
                        principalTable: "SalesOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SalesOrderItems_UnitConversations_UnitId",
                        column: x => x.UnitId,
                        principalTable: "UnitConversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "StockTransferItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    StockTransferId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ProductId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Quantity = table.Column<decimal>(type: "TEXT", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "TEXT", nullable: false),
                    ShippingCharge = table.Column<decimal>(type: "TEXT", nullable: false),
                    SubTotal = table.Column<decimal>(type: "TEXT", nullable: false),
                    UnitId = table.Column<Guid>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockTransferItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StockTransferItems_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StockTransferItems_StockTransfers_StockTransferId",
                        column: x => x.StockTransferId,
                        principalTable: "StockTransfers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StockTransferItems_UnitConversations_UnitId",
                        column: x => x.UnitId,
                        principalTable: "UnitConversations",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_StockTransferItems_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    OrderNumber = table.Column<string>(type: "TEXT",  nullable: true),
                    Note = table.Column<string>(type: "TEXT",  nullable: true),
                    PurchaseReturnNote = table.Column<string>(type: "TEXT",  nullable: true),
                    TermAndCondition = table.Column<string>(type: "TEXT",  nullable: true),
                    IsPurchaseOrderRequest = table.Column<bool>(type: "INTEGER",  nullable: false),
                    POCreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    DeliveryDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    DeliveryStatus = table.Column<int>(type: "INTEGER", nullable: false),
                    SupplierId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    TotalAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    TotalTax = table.Column<decimal>(type: "TEXT", nullable: false),
                    TotalDiscount = table.Column<decimal>(type: "TEXT", nullable: false),
                    TotalPaidAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    PaymentStatus = table.Column<int>(type: "INTEGER", nullable: false),
                    LocationId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseOrders_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PurchaseOrders_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PurchaseOrders_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SendEmails",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Subject = table.Column<string>(type: "TEXT",  nullable: true),
                    Message = table.Column<string>(type: "TEXT",  nullable: true),
                    SupplierId = table.Column<Guid>(type: "TEXT",  nullable: true),
                    CustomerId = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsSend = table.Column<bool>(type: "INTEGER",  nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SendEmails", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SendEmails_Customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SendEmails_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Suppliers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SendEmails_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SalesOrderItemTaxes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    SalesOrderItemId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    TaxId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    TaxValue = table.Column<decimal>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalesOrderItemTaxes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SalesOrderItemTaxes_SalesOrderItems_SalesOrderItemId",
                        column: x => x.SalesOrderItemId,
                        principalTable: "SalesOrderItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SalesOrderItemTaxes_Taxes_TaxId",
                        column: x => x.TaxId,
                        principalTable: "Taxes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "InventoryHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ProductId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    InventorySource = table.Column<int>(type: "INTEGER", nullable: false),
                    Stock = table.Column<decimal>(type: "TEXT", nullable: false),
                    PricePerUnit = table.Column<decimal>(type: "TEXT", nullable: false),
                    PreviousTotalStock = table.Column<decimal>(type: "TEXT", nullable: false),
                    PurchaseOrderId = table.Column<Guid>(type: "TEXT",  nullable: true),
                    SalesOrderId = table.Column<Guid>(type: "TEXT",  nullable: true),
                    LocationId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    StockTransferId = table.Column<Guid>(type: "TEXT",  nullable: true),
                    DamagedStockId = table.Column<Guid>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
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

            migrationBuilder.CreateTable(
                name: "PurchaseOrderItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ProductId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    PurchaseOrderId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    UnitPrice = table.Column<decimal>(type: "TEXT", nullable: false),
                    Quantity = table.Column<decimal>(type: "TEXT", nullable: false),
                    TaxValue = table.Column<decimal>(type: "TEXT", nullable: false),
                    Discount = table.Column<decimal>(type: "TEXT", nullable: false),
                    DiscountPercentage = table.Column<decimal>(type: "TEXT", nullable: false),
                    UnitId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseOrderItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseOrderItems_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_PurchaseOrderItems_PurchaseOrders_PurchaseOrderId",
                        column: x => x.PurchaseOrderId,
                        principalTable: "PurchaseOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PurchaseOrderItems_UnitConversations_UnitId",
                        column: x => x.UnitId,
                        principalTable: "UnitConversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseOrderPayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    PurchaseOrderId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    PaymentDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    ReferenceNumber = table.Column<string>(type: "TEXT",  nullable: true),
                    Amount = table.Column<decimal>(type: "TEXT", nullable: false),
                    PaymentMethod = table.Column<int>(type: "INTEGER", nullable: false),
                    Note = table.Column<string>(type: "TEXT",  nullable: true),
                    AttachmentUrl = table.Column<string>(type: "TEXT",  nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT",  nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT",  nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ModifiedBy = table.Column<Guid>(type: "TEXT",  nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "TEXT",  nullable: true),
                    DeletedBy = table.Column<Guid>(type: "TEXT",  nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER",  nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseOrderPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseOrderPayments_PurchaseOrders_PurchaseOrderId",
                        column: x => x.PurchaseOrderId,
                        principalTable: "PurchaseOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PurchaseOrderPayments_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseOrderItemTaxes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT",  nullable: false),
                    PurchaseOrderItemId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    TaxId = table.Column<Guid>(type: "TEXT",  nullable: false),
                    TaxValue = table.Column<decimal>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseOrderItemTaxes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseOrderItemTaxes_PurchaseOrderItems_PurchaseOrderItemId",
                        column: x => x.PurchaseOrderItemId,
                        principalTable: "PurchaseOrderItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PurchaseOrderItemTaxes_Taxes_TaxId",
                        column: x => x.TaxId,
                        principalTable: "Taxes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Actions_CreatedBy",
                table: "Actions",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Actions_PageId",
                table: "Actions",
                column: "PageId");

            migrationBuilder.CreateIndex(
                name: "IX_Brands_CreatedBy",
                table: "Brands",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Cities_CountryId",
                table: "Cities",
                column: "CountryId");

            migrationBuilder.CreateIndex(
                name: "IX_Cities_CreatedBy",
                table: "Cities",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_CompanyProfiles_CreatedBy",
                table: "CompanyProfiles",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ContactRequests_CreatedBy",
                table: "ContactRequests",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Countries_CreatedBy",
                table: "Countries",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_BillingAddressId",
                table: "Customers",
                column: "BillingAddressId");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_CreatedBy",
                table: "Customers",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_ShippingAddressId",
                table: "Customers",
                column: "ShippingAddressId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyReminders_ReminderId",
                table: "DailyReminders",
                column: "ReminderId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyStocks_LocationId",
                table: "DailyStocks",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyStocks_ProductId",
                table: "DailyStocks",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_DamagedStocks_CreatedBy",
                table: "DamagedStocks",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_DamagedStocks_LocationId",
                table: "DamagedStocks",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_DamagedStocks_ProductId",
                table: "DamagedStocks",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_DamagedStocks_ReportedId",
                table: "DamagedStocks",
                column: "ReportedId");

            migrationBuilder.CreateIndex(
                name: "IX_EmailLogAttachments_EmailLogId",
                table: "EmailLogAttachments",
                column: "EmailLogId");

            migrationBuilder.CreateIndex(
                name: "IX_EmailSMTPSettings_CreatedBy",
                table: "EmailSMTPSettings",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_EmailTemplates_CreatedBy",
                table: "EmailTemplates",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseCategories_CreatedBy",
                table: "ExpenseCategories",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_CreatedBy",
                table: "Expenses",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_ExpenseById",
                table: "Expenses",
                column: "ExpenseById");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_ExpenseCategoryId",
                table: "Expenses",
                column: "ExpenseCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_LocationId",
                table: "Expenses",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseTaxes_CreatedBy",
                table: "ExpenseTaxes",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseTaxes_ExpenseId",
                table: "ExpenseTaxes",
                column: "ExpenseId");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseTaxes_TaxId",
                table: "ExpenseTaxes",
                column: "TaxId");

            migrationBuilder.CreateIndex(
                name: "IX_HalfYearlyReminders_ReminderId",
                table: "HalfYearlyReminders",
                column: "ReminderId");

            migrationBuilder.CreateIndex(
                name: "IX_Inquiries_AssignTo",
                table: "Inquiries",
                column: "AssignTo");

            migrationBuilder.CreateIndex(
                name: "IX_Inquiries_CityId",
                table: "Inquiries",
                column: "CityId");

            migrationBuilder.CreateIndex(
                name: "IX_Inquiries_CountryId",
                table: "Inquiries",
                column: "CountryId");

            migrationBuilder.CreateIndex(
                name: "IX_Inquiries_CreatedBy",
                table: "Inquiries",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Inquiries_InquirySourceId",
                table: "Inquiries",
                column: "InquirySourceId");

            migrationBuilder.CreateIndex(
                name: "IX_Inquiries_InquiryStatusId",
                table: "Inquiries",
                column: "InquiryStatusId");

            migrationBuilder.CreateIndex(
                name: "IX_InquiryActivities_AssignTo",
                table: "InquiryActivities",
                column: "AssignTo");

            migrationBuilder.CreateIndex(
                name: "IX_InquiryActivities_CreatedBy",
                table: "InquiryActivities",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_InquiryActivities_InquiryId",
                table: "InquiryActivities",
                column: "InquiryId");

            migrationBuilder.CreateIndex(
                name: "IX_InquiryAttachments_CreatedBy",
                table: "InquiryAttachments",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_InquiryAttachments_InquiryId",
                table: "InquiryAttachments",
                column: "InquiryId");

            migrationBuilder.CreateIndex(
                name: "IX_InquiryNotes_CreatedBy",
                table: "InquiryNotes",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_InquiryNotes_InquiryId",
                table: "InquiryNotes",
                column: "InquiryId");

            migrationBuilder.CreateIndex(
                name: "IX_InquiryProducts_InquiryId",
                table: "InquiryProducts",
                column: "InquiryId");

            migrationBuilder.CreateIndex(
                name: "IX_InquirySources_CreatedBy",
                table: "InquirySources",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_InquiryStatuses_CreatedBy",
                table: "InquiryStatuses",
                column: "CreatedBy");

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

            migrationBuilder.CreateIndex(
                name: "IX_Languages_CreatedBy",
                table: "Languages",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Locations_CreatedBy",
                table: "Locations",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Pagehelpers_CreatedBy",
                table: "Pagehelpers",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Pages_CreatedBy",
                table: "Pages",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ProductCategories_CreatedBy",
                table: "ProductCategories",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ProductCategories_ParentId",
                table: "ProductCategories",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_BrandId",
                table: "Products",
                column: "BrandId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_CategoryId",
                table: "Products",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_CreatedBy",
                table: "Products",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Products_ParentId",
                table: "Products",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_UnitId",
                table: "Products",
                column: "UnitId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_VariantId",
                table: "Products",
                column: "VariantId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_VariantItemId",
                table: "Products",
                column: "VariantItemId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductTaxes_CreatedBy",
                table: "ProductTaxes",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ProductTaxes_TaxId",
                table: "ProductTaxes",
                column: "TaxId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderItems_ProductId",
                table: "PurchaseOrderItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderItems_PurchaseOrderId",
                table: "PurchaseOrderItems",
                column: "PurchaseOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderItems_UnitId",
                table: "PurchaseOrderItems",
                column: "UnitId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderItemTaxes_PurchaseOrderItemId",
                table: "PurchaseOrderItemTaxes",
                column: "PurchaseOrderItemId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderItemTaxes_TaxId",
                table: "PurchaseOrderItemTaxes",
                column: "TaxId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderPayments_CreatedBy",
                table: "PurchaseOrderPayments",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderPayments_PurchaseOrderId",
                table: "PurchaseOrderPayments",
                column: "PurchaseOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_CreatedBy",
                table: "PurchaseOrders",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_LocationId",
                table: "PurchaseOrders",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_SupplierId",
                table: "PurchaseOrders",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_QuarterlyReminders_ReminderId",
                table: "QuarterlyReminders",
                column: "ReminderId");

            migrationBuilder.CreateIndex(
                name: "IX_ReminderNotifications_ReminderId",
                table: "ReminderNotifications",
                column: "ReminderId");

            migrationBuilder.CreateIndex(
                name: "IX_Reminders_CreatedBy",
                table: "Reminders",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ReminderSchedulers_UserId",
                table: "ReminderSchedulers",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ReminderUsers_UserId",
                table: "ReminderUsers",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RoleClaims_ActionId",
                table: "RoleClaims",
                column: "ActionId");

            migrationBuilder.CreateIndex(
                name: "IX_RoleClaims_RoleId",
                table: "RoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_Roles_CreatedBy",
                table: "Roles",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Roles_DeletedBy",
                table: "Roles",
                column: "DeletedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Roles_ModifiedBy",
                table: "Roles",
                column: "ModifiedBy");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "Roles",
                column: "NormalizedName",
                unique: true,
                filter: "[NormalizedName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrderItems_ProductId",
                table: "SalesOrderItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrderItems_SalesOrderId",
                table: "SalesOrderItems",
                column: "SalesOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrderItems_UnitId",
                table: "SalesOrderItems",
                column: "UnitId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrderItemTaxes_SalesOrderItemId",
                table: "SalesOrderItemTaxes",
                column: "SalesOrderItemId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrderItemTaxes_TaxId",
                table: "SalesOrderItemTaxes",
                column: "TaxId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrderPayments_CreatedBy",
                table: "SalesOrderPayments",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrderPayments_SalesOrderId",
                table: "SalesOrderPayments",
                column: "SalesOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrders_CreatedBy",
                table: "SalesOrders",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrders_CustomerId",
                table: "SalesOrders",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrders_LocationId",
                table: "SalesOrders",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_SendEmails_CreatedBy",
                table: "SendEmails",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_SendEmails_CustomerId",
                table: "SendEmails",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_SendEmails_SupplierId",
                table: "SendEmails",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_StockTransferItems_CreatedBy",
                table: "StockTransferItems",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_StockTransferItems_ProductId",
                table: "StockTransferItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_StockTransferItems_StockTransferId",
                table: "StockTransferItems",
                column: "StockTransferId");

            migrationBuilder.CreateIndex(
                name: "IX_StockTransferItems_UnitId",
                table: "StockTransferItems",
                column: "UnitId");

            migrationBuilder.CreateIndex(
                name: "IX_StockTransfers_CreatedBy",
                table: "StockTransfers",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_StockTransfers_FromLocationId",
                table: "StockTransfers",
                column: "FromLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_StockTransfers_ToLocationId",
                table: "StockTransfers",
                column: "ToLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierAddresses_CityId",
                table: "SupplierAddresses",
                column: "CityId");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierAddresses_CountryId",
                table: "SupplierAddresses",
                column: "CountryId");

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_BillingAddressId",
                table: "Suppliers",
                column: "BillingAddressId");

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_CreatedBy",
                table: "Suppliers",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_ShippingAddressId",
                table: "Suppliers",
                column: "ShippingAddressId");

            migrationBuilder.CreateIndex(
                name: "IX_Taxes_CreatedBy",
                table: "Taxes",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_UnitConversations_CreatedBy",
                table: "UnitConversations",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_UnitConversations_ParentId",
                table: "UnitConversations",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_UserClaims_ActionId",
                table: "UserClaims",
                column: "ActionId");

            migrationBuilder.CreateIndex(
                name: "IX_UserClaims_UserId",
                table: "UserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserLocations_LocationId",
                table: "UserLocations",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_UserLogins_UserId",
                table: "UserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserRoles_RoleId",
                table: "UserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "Users",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "Users",
                column: "NormalizedUserName",
                unique: true,
                filter: "[NormalizedUserName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_VariantItems_CreatedBy",
                table: "VariantItems",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_VariantItems_VariantId",
                table: "VariantItems",
                column: "VariantId");

            migrationBuilder.CreateIndex(
                name: "IX_Variants_CreatedBy",
                table: "Variants",
                column: "CreatedBy");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CompanyProfiles");

            migrationBuilder.DropTable(
                name: "ContactRequests");

            migrationBuilder.DropTable(
                name: "Currencies");

            migrationBuilder.DropTable(
                name: "DailyReminders");

            migrationBuilder.DropTable(
                name: "DailyStocks");

            migrationBuilder.DropTable(
                name: "EmailLogAttachments");

            migrationBuilder.DropTable(
                name: "EmailSMTPSettings");

            migrationBuilder.DropTable(
                name: "EmailTemplates");

            migrationBuilder.DropTable(
                name: "ExpenseTaxes");

            migrationBuilder.DropTable(
                name: "HalfYearlyReminders");

            migrationBuilder.DropTable(
                name: "InquiryActivities");

            migrationBuilder.DropTable(
                name: "InquiryAttachments");

            migrationBuilder.DropTable(
                name: "InquiryNotes");

            migrationBuilder.DropTable(
                name: "InquiryProducts");

            migrationBuilder.DropTable(
                name: "Inventories");

            migrationBuilder.DropTable(
                name: "InventoryHistories");

            migrationBuilder.DropTable(
                name: "Languages");

            migrationBuilder.DropTable(
                name: "LoginAudits");

            migrationBuilder.DropTable(
                name: "NLog");

            migrationBuilder.DropTable(
                name: "Pagehelpers");

            migrationBuilder.DropTable(
                name: "ProductTaxes");

            migrationBuilder.DropTable(
                name: "PurchaseOrderItemTaxes");

            migrationBuilder.DropTable(
                name: "PurchaseOrderPayments");

            migrationBuilder.DropTable(
                name: "QuarterlyReminders");

            migrationBuilder.DropTable(
                name: "ReminderNotifications");

            migrationBuilder.DropTable(
                name: "ReminderSchedulers");

            migrationBuilder.DropTable(
                name: "ReminderUsers");

            migrationBuilder.DropTable(
                name: "RoleClaims");

            migrationBuilder.DropTable(
                name: "SalesOrderItemTaxes");

            migrationBuilder.DropTable(
                name: "SalesOrderPayments");

            migrationBuilder.DropTable(
                name: "SendEmails");

            migrationBuilder.DropTable(
                name: "StockTransferItems");

            migrationBuilder.DropTable(
                name: "TableSettings");

            migrationBuilder.DropTable(
                name: "UserClaims");

            migrationBuilder.DropTable(
                name: "UserLocations");

            migrationBuilder.DropTable(
                name: "UserLogins");

            migrationBuilder.DropTable(
                name: "UserRoles");

            migrationBuilder.DropTable(
                name: "UserTokens");

            migrationBuilder.DropTable(
                name: "EmailLogs");

            migrationBuilder.DropTable(
                name: "Expenses");

            migrationBuilder.DropTable(
                name: "Inquiries");

            migrationBuilder.DropTable(
                name: "DamagedStocks");

            migrationBuilder.DropTable(
                name: "PurchaseOrderItems");

            migrationBuilder.DropTable(
                name: "Reminders");

            migrationBuilder.DropTable(
                name: "SalesOrderItems");

            migrationBuilder.DropTable(
                name: "Taxes");

            migrationBuilder.DropTable(
                name: "StockTransfers");

            migrationBuilder.DropTable(
                name: "Actions");

            migrationBuilder.DropTable(
                name: "Roles");

            migrationBuilder.DropTable(
                name: "ExpenseCategories");

            migrationBuilder.DropTable(
                name: "InquirySources");

            migrationBuilder.DropTable(
                name: "InquiryStatuses");

            migrationBuilder.DropTable(
                name: "PurchaseOrders");

            migrationBuilder.DropTable(
                name: "Products");

            migrationBuilder.DropTable(
                name: "SalesOrders");

            migrationBuilder.DropTable(
                name: "Pages");

            migrationBuilder.DropTable(
                name: "Suppliers");

            migrationBuilder.DropTable(
                name: "Brands");

            migrationBuilder.DropTable(
                name: "ProductCategories");

            migrationBuilder.DropTable(
                name: "UnitConversations");

            migrationBuilder.DropTable(
                name: "VariantItems");

            migrationBuilder.DropTable(
                name: "Customers");

            migrationBuilder.DropTable(
                name: "Locations");

            migrationBuilder.DropTable(
                name: "SupplierAddresses");

            migrationBuilder.DropTable(
                name: "Variants");

            migrationBuilder.DropTable(
                name: "ContactAddresses");

            migrationBuilder.DropTable(
                name: "Cities");

            migrationBuilder.DropTable(
                name: "Countries");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}




