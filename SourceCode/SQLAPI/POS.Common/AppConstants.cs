namespace POS.Common
{
    public static class AppConstants
    {
        public static class Roles
        {
            public const string SuperAdmin = "Super Admin";
            public const string Admin = "Admin";
            public const string Employee = "Employee";
            public const string Staff = "Staff";
        }

        public static class Policies
        {
            public const string SuperAdmin = "SuperAdminPolicy";
        }

        public static class Claims
        {
            public const string USR_ASSIGN_USR_ROLES = "USR_ASSIGN_USR_ROLES";
            public const string Email = "Email";
        }

        public static class Seeding
        {
            public const string DefaultPassword = "admin@123";
            public const string SeedDataFolder = "SeedData";
            public const string MenuItemsFile = "MenuItems.json";
            public const string DefaultLicenseKey = "AAABBB";
            public const string DefaultPurchaseCode = "CCCCRR";
        }

        public static class TenantConfig
        {
            public const int TrialPeriodDays = 14;
            public const int DefaultMaxUsers = 5;
            public const string TrialPlan = "Trial";
            public const string DefaultFBRKey = "DEFAULT_KEY";
            public const string DefaultPOSID = "POS001";
        }

        public static class ExternalApis
        {
            public const string FbrBaseUrl = "https://esp.fbr.gov.pk:8244/FBR/v1/api/Live/PostData";
        }

        public static class Database
        {
            public const int MaxShortLength = 100;
            public const int MaxNameLength = 200;
            public const int MaxUrlLength = 500;
            public const int MaxDescriptionLength = 4000;
            public const int MaxEmailLength = 256;
            public const int MaxPhoneLength = 50;
            public const int MaxAddressLength = 500;
        }

        public static class BusinessType
        {
            public const string Retail = "Retail";
            public const string Pharmacy = "Pharmacy";
            public const string Petrol = "Petrol";
        }

        public static class Prefix
        {
             public const string Pharmacy = "PH";
             public const string Petrol = "PT";
             public const string Retail = "RT";
        }

        public static class DatabaseProviders
        {
            public const string Sqlite = "Microsoft.EntityFrameworkCore.Sqlite";
            public const string SqlServer = "Microsoft.EntityFrameworkCore.SqlServer";
            public const string PostgreSql = "PostgreSQL";
        }
        
        public static class SeedingConstants // Open a new class to avoid conflict if any or append to Seeding
        {
             public static readonly System.Collections.Generic.List<string> PriorityTables = new System.Collections.Generic.List<string>
             {
                    "Tenants",
                    "Users", 
                    "Pages",
                    "Pagehelpers",
                    "Actions",
                    "Roles",
                    "UserRoles",
                    "RoleClaims",
                    "UserClaims",
                    "UserLogins",
                    "UserTokens",
                    "UserLocations",
                    "CompanyProfiles",
                    "Currencies",
                    "Countries",
                    "Cities",
                    "Locations",
                    "FinancialYears",
                    "LedgerAccounts",
                    "Taxes",
                    "UnitConversations",
                    "Brands",
                    "ProductCategories",
                    "ExpenseCategories",
                    "Suppliers",
                    "SupplierAddresses",
                    "Customers",
                    "ContactAddresses",
                    "Products",
                    "ProductTaxes",
                    "ProductStocks",
                    "PurchaseOrders",
                    "PurchaseOrderItems",
                    "PurchaseOrderItemTaxes",
                    "PurchaseOrderPayments",
                    "SalesOrders",
                    "SalesOrderItems",
                    "SalesOrderItemTaxes",
                    "SalesOrderPayments",
                    "Transactions",
                    "TransactionItems",
                    "TransactionItemTaxes",
                    "AccountingEntries",
                    "PaymentEntries",
                    "TaxEntries",
                    "StockAdjustments",
                    "DamagedStocks",
                    "StockTransfers",
                    "StockTransferItems",
                    "Expenses",
                    "ExpenseTaxes",
                    "LoanDetails",
                    "LoanRepayments",
                    "InquiryStatuses",
                    "InquirySources",
                    "Inquiries",
                    "InquiryProducts",
                    "InquiryActivities",
                    "InquiryAttachments",
                    "InquiryNotes",
                    "Reminders",
                    "ReminderUsers",
                    "ReminderSchedulers",
                    "ReminderNotifications",
                    "DailyReminders",
                    "QuarterlyReminders",
                    "HalfYearlyReminders",
                    "EmailTemplates",
                    "EmailSMTPSettings",
                    "Languages"
             };
        }
    }
}
