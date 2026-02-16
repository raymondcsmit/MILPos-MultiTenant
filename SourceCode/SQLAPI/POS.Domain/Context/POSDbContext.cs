using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Data.Entities.Inventory;
using POS.Common;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace POS.Domain
{
    public class POSDbContext : IdentityDbContext<User, Role, Guid, UserClaim, UserRole, UserLogin, RoleClaim, UserToken>
    {
        private readonly ITenantProvider _tenantProvider;
        private readonly UserInfoToken _userInfoToken;

        public POSDbContext(DbContextOptions options, ITenantProvider tenantProvider, UserInfoToken userInfoToken = null) : base(options)
        {
            _tenantProvider = tenantProvider;
            _userInfoToken = userInfoToken;
        }
        public override DbSet<User> Users { get; set; }
        public override DbSet<Role> Roles { get; set; }
        public override DbSet<UserClaim> UserClaims { get; set; }
        public override DbSet<UserRole> UserRoles { get; set; }
        public override DbSet<UserLogin> UserLogins { get; set; }
        public override DbSet<RoleClaim> RoleClaims { get; set; }
        public override DbSet<UserToken> UserTokens { get; set; }
        
        // Multi-tenancy
        public DbSet<Tenant> Tenants { get; set; }
        
        // Sync entities
        public DbSet<SyncMetadata> SyncMetadata { get; set; }
        public DbSet<SyncLog> SyncLogs { get; set; }
        
        public DbSet<Data.Action> Actions { get; set; }
        public DbSet<Page> Pages { get; set; }
        public DbSet<NLog> NLog { get; set; }
        public DbSet<LoginAudit> LoginAudits { get; set; }
        public DbSet<EmailTemplate> EmailTemplates { get; set; }
        public DbSet<EmailSMTPSetting> EmailSMTPSettings { get; set; }
        public DbSet<Country> Countries { get; set; }
        public DbSet<City> Cities { get; set; }
        public DbSet<Supplier> Suppliers { get; set; }
        public DbSet<SupplierAddress> SupplierAddresses { get; set; }
        public DbSet<ContactRequest> ContactRequests { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<Reminder> Reminders { get; set; }
        public DbSet<ReminderNotification> ReminderNotifications { get; set; }
        public DbSet<ReminderUser> ReminderUsers { get; set; }
        public DbSet<ReminderScheduler> ReminderSchedulers { get; set; }
        public DbSet<HalfYearlyReminder> HalfYearlyReminders { get; set; }
        public DbSet<QuarterlyReminder> QuarterlyReminders { get; set; }
        public DbSet<DailyReminder> DailyReminders { get; set; }
        public DbSet<SendEmail> SendEmails { get; set; }
        public DbSet<PurchaseOrder> PurchaseOrders { get; set; }
        public DbSet<PurchaseOrderItem> PurchaseOrderItems { get; set; }
        public DbSet<PurchaseOrderItemTax> PurchaseOrderItemTaxes { get; set; }
        public DbSet<SalesOrder> SalesOrders { get; set; }
        public DbSet<SalesOrderItem> SalesOrderItems { get; set; }
        public DbSet<SalesOrderItemTax> SalesOrderItemTaxes { get; set; }
        public DbSet<CompanyProfile> CompanyProfiles { get; set; }
        public DbSet<ExpenseCategory> ExpenseCategories { get; set; }
        public DbSet<Expense> Expenses { get; set; }
        public DbSet<Currency> Currencies { get; set; }
        public DbSet<ProductCategory> ProductCategories { get; set; }
        public DbSet<Tax> Taxes { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<ProductTax> ProductTaxes { get; set; }
        public DbSet<Inquiry> Inquiries { get; set; }
        public DbSet<InquiryActivity> InquiryActivities { get; set; }
        public DbSet<InquiryAttachment> InquiryAttachments { get; set; }
        public DbSet<InquiryNote> InquiryNotes { get; set; }
        public DbSet<InquirySource> InquirySources { get; set; }
        public DbSet<InquiryProduct> InquiryProducts { get; set; }
        public DbSet<InquiryStatus> InquiryStatuses { get; set; }
        public DbSet<Brand> Brands { get; set; }
        public DbSet<PurchaseOrderPayment> PurchaseOrderPayments { get; set; }
        public DbSet<SalesOrderPayment> SalesOrderPayments { get; set; }
        public DbSet<UnitConversation> UnitConversations { get; set; }
        public DbSet<Variant> Variants { get; set; }
        public DbSet<VariantItem> VariantItems { get; set; }
        public DbSet<EmailLog> EmailLogs { get; set; }
        public DbSet<EmailLogAttachment> EmailLogAttachments { get; set; }
        public DbSet<ExpenseTax> ExpenseTaxes { get; set; }
        public DbSet<Language> Languages { get; set; }
        public DbSet<Location> Locations { get; set; }
        public DbSet<PageHelper> Pagehelpers { get; set; }
        public DbSet<StockTransfer> StockTransfers { get; set; }
        public DbSet<StockTransferItem> StockTransferItems { get; set; }
        public DbSet<ContactAddress> ContactAddresses { get; set; }
        public DbSet<UserLocation> UserLocations { get; set; }
        public DbSet<TableSetting> TableSettings { get; set; }
        public DbSet<DamagedStock> DamagedStocks { get; set; }
        public DbSet<AccountingEntry> AccountingEntries { get; set; }
        public DbSet<LedgerAccount> LedgerAccounts { get; set; }
        public DbSet<TaxEntry> TaxEntries { get; set; }
        public DbSet<Transaction> Transactions { get; set; }
        public DbSet<TransactionItem> TransactionItems { get; set; }
        public DbSet<TransactionItemTax> TransactionItemTaxes { get; set; }
        public DbSet<PaymentEntry> PaymentEntries { get; set; }
        public DbSet<StockAdjustment> StockAdjustments { get; set; }
        public DbSet<ProductStock> ProductStocks { get; set; }
        public DbSet<FinancialYear> FinancialYears { get; set; }
        public DbSet<Payroll> Payrolls { get; set; }
        public DbSet<CustomerLedger> CustomerLedgers { get; set; }
        public DbSet<LoanDetail> LoanDetails { get; set; }
        public DbSet<LoanRepayment> LoanRepayments { get; set; }

        // Dynamic Menu System
        public DbSet<MenuItem> MenuItems { get; set; }
        public DbSet<MenuItemAction> MenuItemActions { get; set; }
        public DbSet<RoleMenuItem> RoleMenuItems { get; set; }
        
        // FBR Integration
        public DbSet<POS.Data.Entities.FBR.FBRSubmissionLog> FBRSubmissionLogs { get; set; }


        public DbSet<DailyProductPrice> DailyProductPrices { get; set; }

        public DbSet<InventoryBatch> InventoryBatches { get; set; }



        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
            
            if (Database.IsSqlite())
            {
                builder.Entity<User>(b =>
                {
                    b.Property(u => u.NormalizedUserName).UseCollation("NOCASE");
                    b.Property(u => u.NormalizedEmail).UseCollation("NOCASE");
                });

                builder.Entity<Role>(b =>
                {
                    b.Property(r => r.NormalizedName).UseCollation("NOCASE");
                });
            }


            // DailyProductPrice Configuration
            builder.Entity<DailyProductPrice>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.ProductId, e.PriceDate, e.TenantId })
                      .IsUnique()
                      .HasDatabaseName("IX_DailyProductPrice_Product_Date_Tenant");

                entity.Property(e => e.SalesPrice).IsRequired();
                entity.Property(e => e.PriceDate).IsRequired();

                entity.HasOne(e => e.Product)
                      .WithMany()
                      .HasForeignKey(e => e.ProductId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // Master Data Indexes
            builder.Entity<Product>(b =>
            {
                b.HasIndex(p => new { p.TenantId, p.Name }).HasDatabaseName("IX_Product_Tenant_Name");
                b.HasIndex(p => new { p.TenantId, p.Code }).IsUnique().HasDatabaseName("IX_Product_Tenant_Code");
                b.HasIndex(p => new { p.TenantId, p.Barcode }).HasDatabaseName("IX_Product_Tenant_Barcode");
                b.HasIndex(p => new { p.TenantId, p.CategoryId }).HasDatabaseName("IX_Product_Tenant_Category");
            });

            builder.Entity<ProductCategory>(b =>
            {
                b.HasIndex(c => new { c.TenantId, c.Name }).HasDatabaseName("IX_ProductCategory_Tenant_Name");
            });

            builder.Entity<Brand>(b =>
            {
                b.HasIndex(br => new { br.TenantId, br.Name }).HasDatabaseName("IX_Brand_Tenant_Name");
            });

            builder.Entity<UnitConversation>(b =>
            {
                b.HasIndex(u => new { u.TenantId, u.Name }).HasDatabaseName("IX_Unit_Tenant_Name");
            });

            builder.Entity<ProductStock>(b =>
            {
                b.HasIndex(ps => new { ps.TenantId, ps.ProductId, ps.LocationId }).IsUnique().HasDatabaseName("IX_ProductStock_Tenant_Product_Location");
            });

            // Sales & Purchase Indexes
            builder.Entity<SalesOrder>(b =>
            {
                b.HasIndex(s => new { s.TenantId, s.OrderNumber }).IsUnique().HasDatabaseName("IX_SalesOrder_Tenant_Number");
                b.HasIndex(s => new { s.TenantId, s.SOCreatedDate }).HasDatabaseName("IX_SalesOrder_Tenant_Date");
                b.HasIndex(s => new { s.TenantId, s.CustomerId }).HasDatabaseName("IX_SalesOrder_Tenant_Customer");
                b.HasIndex(s => new { s.TenantId, s.Status }).HasDatabaseName("IX_SalesOrder_Tenant_Status");
            });

            builder.Entity<PurchaseOrder>(b =>
            {
                b.HasIndex(p => new { p.TenantId, p.OrderNumber }).IsUnique().HasDatabaseName("IX_PurchaseOrder_Tenant_Number");
                b.HasIndex(p => new { p.TenantId, p.POCreatedDate }).HasDatabaseName("IX_PurchaseOrder_Tenant_Date");
                b.HasIndex(p => new { p.TenantId, p.SupplierId }).HasDatabaseName("IX_PurchaseOrder_Tenant_Supplier");
            });

            builder.Entity<SalesOrderItem>(b =>
            {
                b.HasIndex(si => si.SalesOrderId).HasDatabaseName("IX_SalesOrderItem_SalesOrder");
            });

            // CRM Indexes
            builder.Entity<Customer>(b =>
            {
                b.HasIndex(c => new { c.TenantId, c.Email }).IsUnique().HasDatabaseName("IX_Customer_Tenant_Email");
                b.HasIndex(c => new { c.TenantId, c.MobileNo }).IsUnique().HasDatabaseName("IX_Customer_Tenant_Mobile");
                b.HasIndex(c => new { c.TenantId, c.CustomerName }).HasDatabaseName("IX_Customer_Tenant_Name");
            });

            builder.Entity<Supplier>(b =>
            {
                b.HasIndex(s => new { s.TenantId, s.Email }).HasDatabaseName("IX_Supplier_Tenant_Email");
                b.HasIndex(s => new { s.TenantId, s.MobileNo }).HasDatabaseName("IX_Supplier_Tenant_Mobile");
            });

            // Financial Indexes
            builder.Entity<Expense>(b =>
            {
                b.HasIndex(e => new { e.TenantId, e.ExpenseDate }).HasDatabaseName("IX_Expense_Tenant_Date");
                b.HasIndex(e => new { e.TenantId, e.ExpenseCategoryId }).HasDatabaseName("IX_Expense_Tenant_Category");
            });

            builder.Entity<Transaction>(b =>
            {
                b.HasIndex(t => new { t.TenantId, t.TransactionDate }).HasDatabaseName("IX_Transaction_Tenant_Date");
            });

            // User Identity Indexes (Custom)
            builder.Entity<UserClaim>(b =>
            {
                b.HasIndex(uc => new { uc.UserId, uc.ClaimType }).HasDatabaseName("IX_UserClaim_User_Type");
            });
            
            builder.Entity<User>(b =>
            {
                b.HasIndex(u => new { u.TenantId, u.PhoneNumber }).HasDatabaseName("IX_User_Tenant_Phone");
            });

            // Configure InventoryBatch to prevent cycles
            builder.Entity<InventoryBatch>(b =>
            {
                b.HasOne(e => e.Product)
                    .WithMany()
                    .HasForeignKey(e => e.ProductId)
                    .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(e => e.Location)
                    .WithMany()
                    .HasForeignKey(e => e.LocationId)
                    .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });


            // Configure Tenant entity
            builder.Entity<Tenant>(b =>
            {
                b.HasKey(t => t.Id);
                b.HasIndex(t => t.Subdomain).IsUnique();
                b.Property(t => t.Name).IsRequired().HasMaxLength(AppConstants.Database.MaxNameLength);
                b.Property(t => t.Subdomain).IsRequired().HasMaxLength(AppConstants.Database.MaxShortLength);
                b.Property(t => t.ContactEmail).HasMaxLength(AppConstants.Database.MaxNameLength);
                b.Property(t => t.TimeZone).HasMaxLength(AppConstants.Database.MaxShortLength);
                b.Property(t => t.Currency).HasMaxLength(10);
            });

            // Configure SyncMetadata entity (Desktop only - SQLite)
            builder.Entity<SyncMetadata>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.EntityType).IsRequired().HasMaxLength(100);
                entity.HasIndex(e => e.EntityType);
            });

            // Configure SyncLog entity
            builder.Entity<SyncLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.DeviceId).HasMaxLength(50);
                entity.Property(e => e.ErrorMessage).HasMaxLength(4000);
                entity.HasIndex(e => new { e.TenantId, e.StartedAt });
            });

            builder.Entity<User>(b =>
            {
                // Remove default Identity indexes before adding tenant-aware ones
                var userIndex = b.Metadata.GetIndexes().FirstOrDefault(i => i.Properties.Any(p => p.Name == "NormalizedUserName") && i.Properties.Count == 1);
                if (userIndex != null) b.Metadata.RemoveIndex(userIndex);

                var emailIndex = b.Metadata.GetIndexes().FirstOrDefault(i => i.Properties.Any(p => p.Name == "NormalizedEmail") && i.Properties.Count == 1);
                if (emailIndex != null) b.Metadata.RemoveIndex(emailIndex);

                // Redefine UserNameIndex to be tenant-aware
                b.HasIndex(u => new { u.NormalizedUserName, u.TenantId })
                    .IsUnique()
                    .HasDatabaseName("UserNameIndex");

                // Redefine EmailIndex to be tenant-aware
                b.HasIndex(u => new { u.NormalizedEmail, u.TenantId })
                    .IsUnique()
                    .HasDatabaseName("EmailIndex");

                // Configure User-Tenant relationship
                b.HasOne(u => u.Tenant)
                    .WithMany()
                    .HasForeignKey(u => u.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);


                // Each User can have many UserClaims
                b.HasMany(e => e.UserClaims)
                    .WithOne(e => e.User)
                    .HasForeignKey(uc => uc.UserId)
                    .IsRequired();

                // Each User can have many UserLogins
                b.HasMany(e => e.UserLogins)
                    .WithOne(e => e.User)
                    .HasForeignKey(ul => ul.UserId)
                    .IsRequired();

                // Each User can have many UserTokens
                b.HasMany(e => e.UserTokens)
                    .WithOne(e => e.User)
                    .HasForeignKey(ut => ut.UserId)
                    .IsRequired();

                // Each User can have many entries in the UserRole join table
                b.HasMany(e => e.UserRoles)
                    .WithOne(e => e.User)
                    .HasForeignKey(ur => ur.UserId)
                    .IsRequired();

                b.HasMany(e => e.UserLocations)
                    .WithOne(e => e.User)
                    .HasForeignKey(ur => ur.UserId)
                    .IsRequired();
            });

            builder.Entity<DamagedStock>(b =>
            {
                b.HasOne(e => e.ReportedBy)
               .WithMany()
               .HasForeignKey(ur => ur.ReportedId)
              .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(e => e.CreatedByUser)
                .WithMany()
                .HasForeignKey(ur => ur.CreatedBy)
               .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<Role>(b =>
            {
                // Remove default Identity index before adding tenant-aware one
                var roleIndex = b.Metadata.GetIndexes().FirstOrDefault(i => i.Properties.Any(p => p.Name == "NormalizedName") && i.Properties.Count == 1);
                if (roleIndex != null) b.Metadata.RemoveIndex(roleIndex);

                // Redefine RoleNameIndex to be tenant-aware
                b.HasIndex(r => new { r.NormalizedName, r.TenantId })
                    .IsUnique()
                    .HasDatabaseName("RoleNameIndex");

                // Configure Role-Tenant relationship
                b.HasOne(r => r.Tenant)
                    .WithMany()
                    .HasForeignKey(r => r.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Each Role can have many entries in the UserRole join table
                b.HasMany(e => e.UserRoles)
                    .WithOne(e => e.Role)
                    .HasForeignKey(ur => ur.RoleId)
                    .IsRequired();

                // Each Role can have many associated RoleClaims
                b.HasMany(e => e.RoleClaims)
                    .WithOne(e => e.Role)
                    .HasForeignKey(rc => rc.RoleId)
                    .IsRequired();

                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(e => e.ModifiedByUser)
                    .WithMany()
                    .HasForeignKey(rc => rc.ModifiedBy)
                    .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(e => e.DeletedByUser)
                    .WithMany()
                    .HasForeignKey(rc => rc.DeletedBy)
                    .OnDelete(DeleteBehavior.Restrict);

            });

            builder.Entity<ReminderUser>(b =>
            {
                b.HasKey(e => new { e.ReminderId, e.UserId });
                b.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(ur => ur.UserId)
                  .OnDelete(DeleteBehavior.NoAction);
            });

            builder.Entity<Data.Action>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<Page>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<EmailSMTPSetting>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);

            });

            builder.Entity<Customer>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
                b.HasOne(e => e.BillingAddress)
                  .WithMany()
                  .HasForeignKey(rc => rc.BillingAddressId)
                  .OnDelete(DeleteBehavior.Restrict);
                b.HasOne(e => e.ShippingAddress)
                  .WithMany()
                  .HasForeignKey(rc => rc.ShippingAddressId)
                  .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<SalesOrder>()
                   .HasOne(so => so.Customer)
                   .WithMany()
                   .HasForeignKey(so => so.CustomerId)
                   .OnDelete(DeleteBehavior.Restrict); // Change from Cascade to Restrict

            builder.Entity<SalesOrder>()
                .HasOne(so => so.Location)
                .WithMany()
                .HasForeignKey(so => so.LocationId)
                .OnDelete(DeleteBehavior.Restrict); // Change from Cascade to Restrict

            builder.Entity<SalesOrder>()
                .HasOne(so => so.CreatedByUser)
                .WithMany()
                .HasForeignKey(so => so.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict); // Change from Cascade to Restrict


            builder.Entity<UserLocation>()
                .HasKey(ul => new { ul.UserId, ul.LocationId });


            builder.Entity<VariantItem>()
                .HasKey(vi => vi.Id);

            builder.Entity<VariantItem>()
                .HasOne(vi => vi.CreatedByUser)
                .WithMany()
                .HasForeignKey(vi => vi.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict); // Change from Cascade to Restrict

            builder.Entity<VariantItem>()
                .HasOne(vi => vi.Variant)
                .WithMany(v => v.VariantItems)
                .HasForeignKey(vi => vi.VariantId)
                .OnDelete(DeleteBehavior.Restrict); // Change from Cascade to Restrict

            builder.Entity<ExpenseTax>()
        .HasKey(et => et.Id);

            builder.Entity<ExpenseTax>()
                .HasOne(et => et.Expense)
                .WithMany()
                .HasForeignKey(et => et.ExpenseId)
                .OnDelete(DeleteBehavior.Restrict); // Change from Cascade to Restrict

            builder.Entity<ExpenseTax>()
                .HasOne(et => et.Tax)
                .WithMany()
                .HasForeignKey(et => et.TaxId)
                .OnDelete(DeleteBehavior.Restrict); // Change from Cascade to Restrict

            builder.Entity<ExpenseTax>()
                .HasOne(et => et.CreatedByUser)
                .WithMany()
                .HasForeignKey(et => et.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict); // Change from Cascade to Restrict

            builder.Entity<InquiryProduct>()
                .HasKey(ip => new { ip.ProductId, ip.InquiryId });

            builder.Entity<InquiryProduct>()
                .HasOne(ip => ip.Inquiry)
                .WithMany(i => i.InquiryProducts)
                .HasForeignKey(ip => ip.InquiryId)
                .OnDelete(DeleteBehavior.Restrict); // Change from Cascade to Restrict

            builder.Entity<InquiryProduct>()
                .HasOne(ip => ip.Product)
                .WithMany()
                .HasForeignKey(ip => ip.ProductId)
                .OnDelete(DeleteBehavior.Restrict); // Change from Cascade to Restrict


            builder.Entity<ProductStock>()
                .HasOne(i => i.Product)
                 .WithMany(c => c.ProductStocks)
                .HasForeignKey(i => i.ProductId)
                .OnDelete(DeleteBehavior.Restrict); // Change to Restrict



            builder.Entity<PurchaseOrder>()
                .HasOne(p => p.CreatedByUser)
                .WithMany()
                .HasForeignKey(p => p.CreatedBy)
                .OnDelete(DeleteBehavior.NoAction); // Change to NoAction or Restrict

            builder.Entity<PurchaseOrderItem>()
                .HasOne(p => p.Product)
                .WithMany()
                .HasForeignKey(p => p.ProductId)
                .OnDelete(DeleteBehavior.NoAction); // Or DeleteBehavior.Restrict

            builder.Entity<PurchaseOrderItem>()
                .HasOne(p => p.UnitConversation)
                .WithMany()
                .HasForeignKey(p => p.UnitId)
                .OnDelete(DeleteBehavior.NoAction); // Or DeleteBehavior.Restrict

            builder.Entity<Supplier>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(e => e.BillingAddress)
                  .WithMany()
                  .HasForeignKey(rc => rc.BillingAddressId)
                  .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(e => e.ShippingAddress)
                  .WithMany()
                  .HasForeignKey(rc => rc.ShippingAddressId)
                  .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<ProductCategory>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<UnitConversation>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);

            });

            builder.Entity<EmailTemplate>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<Reminder>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<ReminderScheduler>(b =>
            {
                b.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(rs => rs.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(rs => rs.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<Expense>(b =>
            {
                b.HasOne(e => e.ExpenseBy)
                    .WithMany()
                    .HasForeignKey(rc => rc.ExpenseById)
                    .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);

                b.HasMany(e => e.ExpenseTaxes)
                  .WithOne(c => c.Expense)
                  .HasForeignKey(rc => rc.ExpenseId)
                  .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<ExpenseCategory>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<ProductTax>(b =>
            {
                b.HasKey(c => new { c.ProductId, c.TaxId });
            });

            builder.Entity<City>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });


            builder.Entity<Tax>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<Product>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);

            });

            builder.Entity<ProductTax>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<InquirySource>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<InquiryStatus>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<InquiryProduct>(b =>
            {
                b.HasKey(c => new { c.ProductId, c.InquiryId });
            });

            builder.Entity<InquiryActivity>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<InquiryAttachment>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<InquiryNote>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<Brand>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<PurchaseOrderPayment>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<PurchaseOrderItem>(b =>
            {
                b.HasOne(e => e.UnitConversation)
                    .WithMany()
                    .HasForeignKey(ur => ur.UnitId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<SalesOrderItem>(b =>
            {
                b.HasOne(e => e.UnitConversation)
                    .WithMany()
                    .HasForeignKey(ur => ur.UnitId)
                    .OnDelete(DeleteBehavior.Restrict);

            });

            builder.Entity<SalesOrderPayment>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<Data.Page>(b =>
            {
                // Each User can have many UserClaims
                b.HasMany(e => e.Actions)
                    .WithOne(e => e.Page)
                    .HasForeignKey(uc => uc.PageId)
                    .OnDelete(DeleteBehavior.Restrict)
                    .IsRequired();
            });

            builder.Entity<Location>(b =>
            {
                b.HasMany(e => e.UserLocations)
                    .WithOne(c => c.Location)
                    .HasForeignKey(ur => ur.LocationId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<StockTransfer>(b =>
            {
                b.HasMany(e => e.StockTransferItems)
                   .WithOne(c => c.StockTransfer)
                   .HasForeignKey(ur => ur.StockTransferId)
                   .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(st => st.FromLocation)
                    .WithMany()
                    .HasForeignKey(st => st.FromLocationId)
                    .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(st => st.ToLocation)
                    .WithMany()
                    .HasForeignKey(st => st.ToLocationId)
                    .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(st => st.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(st => st.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });
            builder.Entity<AccountingEntry>(b =>
            {
                b.HasOne(st => st.CreditLedgerAccount)
                  .WithMany(st => st.CreditEntries)
                  .HasForeignKey(st => st.CreditLedgerAccountId)
                  .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(st => st.DebitLedgerAccount)
                 .WithMany(st => st.DebitEntries)
                 .HasForeignKey(st => st.DebitLedgerAccountId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(st => st.Transaction)
                  .WithMany(st => st.AccountingEntries)
                  .HasForeignKey(st => st.TransactionId)
                  .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(st => st.Branch)
                 .WithMany()
                 .HasForeignKey(st => st.BranchId)
                 .OnDelete(DeleteBehavior.NoAction);

                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedBy)
                    .OnDelete(DeleteBehavior.NoAction);

            });

            builder.Entity<Transaction>(b =>
            {
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(ur => ur.CreatedBy)
                    .OnDelete(DeleteBehavior.NoAction);

                b.HasMany(e => e.TransactionItems)
                  .WithOne(e => e.Transaction)
                  .HasForeignKey(ur => ur.TransactionId)
                  .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(e => e.FinancialYear)
                    .WithMany()
                    .HasForeignKey(t => t.FinancialYearId)
                    .OnDelete(DeleteBehavior.Restrict);

            });

            builder.Entity<TransactionItem>(b =>
            {
                b.HasOne(e => e.Unit)
                    .WithMany()
                    .HasForeignKey(ur => ur.UnitId)
                    .OnDelete(DeleteBehavior.ClientSetNull);

            });
            builder.Entity<TransactionItemTax>(b =>
            {
                b.HasKey(t => new { t.TransactionItemId, t.TaxId }); // Composite key

                b.HasOne(t => t.TransactionItem)
                    .WithMany(ti => ti.TransactionItemTaxes) // Collection navigation in TransactionItem
                    .HasForeignKey(t => t.TransactionItemId)
                    .OnDelete(DeleteBehavior.Cascade); // Delete taxes when item is deleted

                b.HasOne(t => t.Tax)
                    .WithMany() // Assuming Tax does not have navigation back
                    .HasForeignKey(t => t.TaxId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<PaymentEntry>(b =>
            {
                b.HasOne(e => e.Transaction)
                    .WithMany(c => c.PaymentEntries)
                    .HasForeignKey(ur => ur.TransactionId)
                    .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(e => e.Branch)
                   .WithMany()
                   .HasForeignKey(ur => ur.BranchId)
                   .OnDelete(DeleteBehavior.NoAction);

            });

            builder.Entity<TaxEntry>(b =>
            {
                b.HasOne(e => e.Transaction)
                    .WithMany(c => c.TaxEntries)
                    .HasForeignKey(ur => ur.TransactionId)
                    .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(e => e.Branch)
                   .WithMany()
                   .HasForeignKey(ur => ur.BranchId)
                   .OnDelete(DeleteBehavior.NoAction);

            });
            builder.Entity<StockAdjustment>(b =>
            {
                b.HasOne(e => e.InventoryItem)
                    .WithMany()
                    .HasForeignKey(ur => ur.InventoryItemId)
                    .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(e => e.Branch)
                   .WithMany()
                   .HasForeignKey(ur => ur.BranchId)
                   .OnDelete(DeleteBehavior.NoAction);

            });
            builder.Entity<Payroll>(b =>
            {
                b.HasOne(e => e.Employee)
                    .WithMany()
                    .HasForeignKey(ur => ur.EmployeeId)
                    .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(e => e.Location)
                   .WithMany()
                   .HasForeignKey(ur => ur.BranchId)
                   .OnDelete(DeleteBehavior.NoAction);
            });

            // MenuItem Configuration for Hybrid Tenant/Global Filter
            builder.Entity<MenuItem>().HasQueryFilter(m =>
                m.TenantId == _tenantProvider.GetTenantId()
                && !m.IsDeleted);


            builder.Entity<CustomerLedger>(b =>
            {
                b.HasOne(e => e.Customer)
                    .WithMany()
                    .HasForeignKey(e => e.CustomerId)
                    .OnDelete(DeleteBehavior.Restrict);
                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedBy)
                    .OnDelete(DeleteBehavior.NoAction);
            });

            builder.Entity<LoanDetail>(b =>
            {
                b.HasOne(e => e.LoanAccount)
                    .WithMany()
                    .HasForeignKey(e => e.LoanAccountId)
                    .OnDelete(DeleteBehavior.Restrict);
                b.HasOne(e => e.LoanAccountInterestExpense)
                    .WithMany()
                    .HasForeignKey(e => e.LoanAccountInterestExpenseId)
                    .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(e => e.Branch)
                  .WithMany()
                  .HasForeignKey(e => e.BranchId)
                  .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(e => e.CreatedByUser)
                     .WithMany()
                     .HasForeignKey(e => e.CreatedBy)
                     .OnDelete(DeleteBehavior.NoAction);
            });
            builder.Entity<LoanRepayment>(b =>
            {
                b.HasOne(e => e.LoanDetail)
                    .WithMany(c => c.LoanRepayments)
                    .HasForeignKey(e => e.LoanDetailId)
                    .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(e => e.CreatedByUser)
                     .WithMany()
                     .HasForeignKey(e => e.CreatedBy)
                     .OnDelete(DeleteBehavior.NoAction);
            });

            builder.Entity<LedgerAccount>(b =>
            {
                b.Property(d => d.IsSystem).HasDefaultValue(true);
            });

            // Dynamic Menu System Configuration
            builder.Entity<MenuItem>(entity =>
            {
                entity.HasOne(m => m.Parent)
                    .WithMany(m => m.Children)
                    .HasForeignKey(m => m.ParentId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<MenuItemAction>(entity =>
            {
                entity.HasKey(e => new { e.MenuItemId, e.ActionId });
                
                entity.HasOne(e => e.MenuItem)
                    .WithMany(m => m.MenuItemActions)
                    .HasForeignKey(e => e.MenuItemId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasOne(e => e.Action)
                    .WithMany()
                    .HasForeignKey(e => e.ActionId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            builder.Entity<RoleMenuItem>(entity =>
            {
                entity.HasOne(e => e.Role)
                    .WithMany()
                    .HasForeignKey(e => e.RoleId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.HasOne(e => e.MenuItem)
                    .WithMany(m => m.RoleMenuItems)
                    .HasForeignKey(e => e.MenuItemId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.AssignedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.AssignedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // --- String Length Optimizations ---

            // 1. Identity & Tenant Updates
            builder.Entity<Tenant>(b => {
                b.Property(t => t.Address).HasMaxLength(1000);
                b.Property(t => t.ContactPhone).HasMaxLength(50);
                b.Property(t => t.SubscriptionPlan).HasMaxLength(100);
                b.Property(t => t.ConnectionString).HasMaxLength(1000);
            });

            builder.Entity<User>(b => {
                b.Property(u => u.FirstName).HasMaxLength(200);
                b.Property(u => u.LastName).HasMaxLength(200);
                b.Property(u => u.ProfilePhoto).HasMaxLength(500);
                b.Property(u => u.Provider).HasMaxLength(100);
                b.Property(u => u.Address).HasMaxLength(500);
                b.Property(u => u.ResetPasswordCode).HasMaxLength(500);
            });

            // 2. Master Data (Shared/Global Entities - Bypass Tenant Filter)
            builder.Entity<Country>(b => {
                b.Property(c => c.CountryName).HasMaxLength(200);
                b.HasQueryFilter(x => true); // Bypass Global Tenant Filter
            });
            builder.Entity<City>(b => {
                b.Property(c => c.CityName).HasMaxLength(200);
                b.HasQueryFilter(x => true); // Bypass Global Tenant Filter
            });
            
            builder.Entity<Location>(b => {
                b.Property(l => l.Name).HasMaxLength(200);
                b.Property(l => l.ContactPerson).HasMaxLength(200);
                b.Property(l => l.Address).HasMaxLength(500);
                b.Property(l => l.Email).HasMaxLength(256);
                b.Property(l => l.Mobile).HasMaxLength(50);
                b.Property(l => l.Website).HasMaxLength(500);
                b.Property(l => l.FBRKey).HasMaxLength(500).IsRequired();
                b.Property(l => l.POSID).HasMaxLength(20).IsRequired();
                b.Property(l => l.ApiBaseUrl).HasMaxLength(200).IsRequired();
            });

            builder.Entity<Currency>(b => {
                b.Property(c => c.Name).HasMaxLength(100);
                b.Property(c => c.Symbol).HasMaxLength(10);
                b.HasQueryFilter(x => true); // Bypass Global Tenant Filter
            });

            builder.Entity<Language>(b => {
                b.Property(l => l.Name).HasMaxLength(100);
                b.Property(l => l.Code).HasMaxLength(20);
                b.Property(l => l.ImageUrl).HasMaxLength(500);
                b.HasQueryFilter(x => true); // Bypass Global Tenant Filter
            });

            // 3. Business Entities
            builder.Entity<Customer>(b => {
                b.Property(c => c.CustomerName).HasMaxLength(250);
                b.Property(c => c.ContactPerson).HasMaxLength(200);
                b.Property(c => c.Email).HasMaxLength(256);
                b.Property(c => c.PhoneNo).HasMaxLength(50);
                b.Property(c => c.MobileNo).HasMaxLength(50);
                b.Property(c => c.Fax).HasMaxLength(50);
                b.Property(c => c.Website).HasMaxLength(500);
                b.Property(c => c.Url).HasMaxLength(500);
                b.Property(c => c.TaxNumber).HasMaxLength(50);
                b.Property(c => c.Description).HasMaxLength(2000);
            });

            builder.Entity<Supplier>(b => {
                b.Property(s => s.SupplierName).HasMaxLength(250);
                b.Property(s => s.ContactPerson).HasMaxLength(200);
                b.Property(s => s.Email).HasMaxLength(256);
                b.Property(s => s.PhoneNo).HasMaxLength(50);
                b.Property(s => s.MobileNo).HasMaxLength(50);
                b.Property(s => s.Fax).HasMaxLength(50);
                b.Property(s => s.Website).HasMaxLength(500);
                b.Property(s => s.Url).HasMaxLength(500);
                b.Property(s => s.TaxNumber).HasMaxLength(50);
                b.Property(s => s.Description).HasMaxLength(2000);
            });

             builder.Entity<SupplierAddress>(b => {
                b.Property(a => a.Address).HasMaxLength(500);
                b.Property(a => a.CountryName).HasMaxLength(200);
                b.Property(a => a.CityName).HasMaxLength(200);
            });

            builder.Entity<ContactRequest>(b => {
                b.Property(c => c.Name).HasMaxLength(200);
                b.Property(c => c.Email).HasMaxLength(256);
                b.Property(c => c.Phone).HasMaxLength(50);
                b.Property(c => c.Message).HasMaxLength(4000); 
            });

            // 4. Inventory
             builder.Entity<Product>(b => {
                b.Property(p => p.Name).HasMaxLength(200);
                b.Property(p => p.Code).HasMaxLength(100);
                b.Property(p => p.Barcode).HasMaxLength(100); 
                b.Property(p => p.SkuCode).HasMaxLength(100); 
                b.Property(p => p.SkuName).HasMaxLength(200);
                b.Property(p => p.Description).HasMaxLength(4000);
                b.Property(p => p.ProductUrl).HasMaxLength(500);
            });

            builder.Entity<ProductCategory>(b => {
                b.Property(c => c.Name).HasMaxLength(200);
                b.Property(c => c.Description).HasMaxLength(1000);
            });
            
             builder.Entity<Brand>(b => {
                b.Property(b => b.Name).HasMaxLength(200);
                b.Property(b => b.ImageUrl).HasMaxLength(500);
            });
            
             builder.Entity<UnitConversation>(b => {
                b.Property(u => u.Name).HasMaxLength(100);
                b.Property(u => u.Code).HasMaxLength(50); 
                // Operator is Enum, no MaxLength
            });

             builder.Entity<Variant>(b => b.Property(v => v.Name).HasMaxLength(200));
             builder.Entity<VariantItem>(b => b.Property(v => v.Name).HasMaxLength(200));

             builder.Entity<StockTransfer>(b => {
                b.Property(s => s.ReferenceNo).HasMaxLength(50);
                b.Property(s => s.Notes).HasMaxLength(1000);
             });

            // 5. Sales & Purchase orders
            builder.Entity<SalesOrder>(b => {
                b.Property(s => s.OrderNumber).HasMaxLength(50);
                b.Property(s => s.Note).HasMaxLength(2000);
                b.Property(s => s.SaleReturnNote).HasMaxLength(2000);
                b.Property(s => s.TermAndCondition).HasMaxLength(4000);
            });

            builder.Entity<PurchaseOrder>(b => {
                b.Property(p => p.OrderNumber).HasMaxLength(50);
                b.Property(p => p.Note).HasMaxLength(2000);
                b.Property(p => p.TermAndCondition).HasMaxLength(4000);
            });
            
             builder.Entity<SalesOrderPayment>(b => {
                b.Property(p => p.ReferenceNumber).HasMaxLength(50);
                b.Property(p => p.Note).HasMaxLength(1000);
            });

             builder.Entity<PurchaseOrderPayment>(b => {
                 b.Property(p => p.ReferenceNumber).HasMaxLength(50);
                 b.Property(p => p.Note).HasMaxLength(1000);
            });

            // 6. Finance
            builder.Entity<Expense>(b => {
                 b.Property(e => e.Reference).HasMaxLength(100);
                 b.Property(e => e.Description).HasMaxLength(1000);
                 b.Property(e => e.ReceiptName).HasMaxLength(200);
                 b.Property(e => e.ReceiptPath).HasMaxLength(500);
            });

            builder.Entity<ExpenseCategory>(b => b.Property(e => e.Name).HasMaxLength(200));

            builder.Entity<LedgerAccount>(b => {
                b.Property(l => l.AccountName).HasMaxLength(200);
                b.Property(l => l.AccountCode).HasMaxLength(50);
            });
            
            builder.Entity<Tax>(b => b.Property(t => t.Name).HasMaxLength(100));

            // 7. Inquiry
             builder.Entity<Inquiry>(b => {
                 b.Property(i => i.CompanyName).HasMaxLength(200);
                 b.Property(i => i.ContactPerson).HasMaxLength(200);
                 b.Property(i => i.Email).HasMaxLength(256);
                 b.Property(i => i.Phone).HasMaxLength(50);
                 b.Property(i => i.MobileNo).HasMaxLength(50);
                 b.Property(i => i.Website).HasMaxLength(500);
                 b.Property(i => i.Address).HasMaxLength(500);
                 b.Property(i => i.CityName).HasMaxLength(200);
                 b.Property(i => i.CountryName).HasMaxLength(200);
                 b.Property(i => i.Message).HasMaxLength(4000);
            });
            
             builder.Entity<InquirySource>(b => b.Property(i => i.Name).HasMaxLength(200));
             builder.Entity<InquiryStatus>(b => b.Property(i => i.Name).HasMaxLength(200));

             // 8. Logs
             builder.Entity<NLog>(b => {
                 b.Property(n => n.MachineName).HasMaxLength(100);
                 b.Property(n => n.Level).HasMaxLength(50);
                 b.Property(n => n.Logger).HasMaxLength(250);
             });
             
             builder.Entity<EmailLog>(b => {
                 b.Property(e => e.SenderEmail).HasMaxLength(256);
                 b.Property(e => e.RecipientEmail).HasMaxLength(256);
                 b.Property(e => e.Subject).HasMaxLength(500);
                 b.Property(e => e.ErrorMessage).HasMaxLength(4000);
             });

            // Apply global query filters for multi-tenancy
            ApplyTenantQueryFilters(builder);

            builder.Entity<User>().ToTable("Users");
            builder.Entity<Role>().ToTable("Roles");
            builder.Entity<RoleClaim>().ToTable("RoleClaims");
            builder.Entity<UserClaim>().ToTable("UserClaims");
            builder.Entity<UserLogin>().ToTable("UserLogins");
            builder.Entity<UserRole>().ToTable("UserRoles");
            builder.Entity<UserToken>().ToTable("UserTokens");
            builder.DefalutMappingValue();
            builder.DefalutDeleteValueFilter();

            // Automated Global Indexing for Multi-Tenancy
            foreach (var entityType in builder.Model.GetEntityTypes())
            {
                // Check if entity inherits from BaseEntity (Tenant Data)
                if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
                {
                    // Configure CreatedBy relationship to Restrict to avoid cycles
                    try
                    {
                        builder.Entity(entityType.ClrType)
                            .HasOne("CreatedByUser")
                            .WithMany()
                            .HasForeignKey("CreatedBy")
                            .OnDelete(DeleteBehavior.Restrict);
                    }
                    catch (InvalidOperationException)
                    {
                        // Ignore if navigation property doesn't exist or is already configured (e.g. User entity itself)
                    }

                    var tenantIdProperty = entityType.FindProperty("TenantId");
                    if (tenantIdProperty != null)
                    {
                        // Add a non-unique index on TenantId if one doesn't exist starting with TenantId
                        // We check existing indexes to avoid redundancy
                        var existingIndex = entityType.GetIndexes()
                            .Any(i => i.Properties.Count > 0 && i.Properties[0].Name == "TenantId");

                        if (!existingIndex)
                        {
                            builder.Entity(entityType.ClrType)
                                .HasIndex("TenantId")
                                .HasDatabaseName($"IX_{entityType.ClrType.Name}_TenantId");
                        }
                    }
                }
            }
        }

        public Guid? CurrentTenantId => _tenantProvider?.GetTenantId();

        private void ApplyTenantQueryFilters(ModelBuilder builder)
        {
            // Apply to User entity
            builder.Entity<User>()
                .HasQueryFilter(u => u.TenantId == CurrentTenantId && !u.IsDeleted);

            // Apply to Role entity
            builder.Entity<Role>()
                .HasQueryFilter(r => r.TenantId == CurrentTenantId && !r.IsDeleted);

            // Entities that should remain global (Shared Master Data)
            var globalEntityTypes = new[]
            {
                typeof(POS.Data.Country),
                typeof(POS.Data.City),
                typeof(POS.Data.Entities.Language),
                typeof(POS.Data.Entities.PageHelper)
            };

            // Apply to all entities inheriting from BaseEntity EXCEPT global ones
            var entityTypes = builder.Model.GetEntityTypes()
                .Where(t => typeof(BaseEntity).IsAssignableFrom(t.ClrType) 
                            && !globalEntityTypes.Contains(t.ClrType))
                .ToList();

            var setGlobalQueryFilterMethod = typeof(POSDbContext)
                .GetMethods(System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
                .Single(t => t.IsGenericMethod && t.Name == nameof(SetGlobalQueryFilter));

            foreach (var entityType in entityTypes)
            {
                var method = setGlobalQueryFilterMethod.MakeGenericMethod(entityType.ClrType);
                method.Invoke(this, new object[] { builder });
            }
            
            // Apply similar filter for SharedBaseEntity (Global but track IsDeleted)
             var sharedEntityTypes = builder.Model.GetEntityTypes()
                .Where(t => typeof(SharedBaseEntity).IsAssignableFrom(t.ClrType))
                .ToList();

            var setSharedQueryFilterMethod = typeof(POSDbContext)
                .GetMethods(System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
                .Single(t => t.IsGenericMethod && t.Name == nameof(SetSharedQueryFilter));

            foreach (var entityType in sharedEntityTypes)
            {
                var method = setSharedQueryFilterMethod.MakeGenericMethod(entityType.ClrType);
                method.Invoke(this, new object[] { builder });
            }
        }

        private void SetGlobalQueryFilter<T>(ModelBuilder builder) where T : BaseEntity
        {
            builder.Entity<T>().HasQueryFilter(e => e.TenantId == CurrentTenantId && !e.IsDeleted);
        }
        
        private void SetSharedQueryFilter<T>(ModelBuilder builder) where T : SharedBaseEntity
        {
            builder.Entity<T>().HasQueryFilter(e => !e.IsDeleted);
        }

        public override int SaveChanges()
        {
            ApplyTenantId();
            return base.SaveChanges();
        }

        public override async System.Threading.Tasks.Task<int> SaveChangesAsync(System.Threading.CancellationToken cancellationToken = default)
        {
            ApplyTenantId();
            return await base.SaveChangesAsync(cancellationToken);
        }

        private void ApplyTenantId()
        {
            var tenantId = _tenantProvider?.GetTenantId();
            if (!tenantId.HasValue)
            {
                // For operations that don't require tenant context (like creating the first tenant)
                // we'll allow it to proceed
                return;
            }

            var userId = _userInfoToken?.Id ?? Guid.Empty;

            // Handle BaseEntity - Added state
            foreach (var entry in ChangeTracker.Entries<BaseEntity>()
                .Where(e => e.State == EntityState.Added))
            {
                // Auto-populate TenantId
                if (entry.Entity.TenantId == Guid.Empty || entry.Entity.TenantId == null)
                {
                    entry.Entity.TenantId = tenantId.Value;
                }
                
                // Auto-populate audit fields as fallback (only if not already set)
                if (entry.Entity.CreatedBy == Guid.Empty && userId != Guid.Empty)
                {
                    entry.Entity.CreatedBy = userId;
                }
                
                if (entry.Entity.CreatedDate == default(DateTime))
                {
                    entry.Entity.CreatedDate = DateTime.UtcNow;
                }
            }
            
            // Handle BaseEntity - Modified state
            foreach (var entry in ChangeTracker.Entries<BaseEntity>()
                .Where(e => e.State == EntityState.Modified))
            {
                // Auto-populate modified audit fields as fallback
                if (entry.Entity.ModifiedBy == Guid.Empty && userId != Guid.Empty)
                {
                    entry.Entity.ModifiedBy = userId;
                }
                
                if (entry.Entity.ModifiedDate == default(DateTime))
                {
                    entry.Entity.ModifiedDate = DateTime.UtcNow;
                }
            }

            // Handle User - Added state
            foreach (var entry in ChangeTracker.Entries<User>()
                .Where(e => e.State == EntityState.Added))
            {
                if (entry.Entity.TenantId == Guid.Empty)
                {
                    entry.Entity.TenantId = tenantId.Value;
                }
            }

            // Handle Role - Added state
            foreach (var entry in ChangeTracker.Entries<Role>()
                .Where(e => e.State == EntityState.Added))
            {
                if (entry.Entity.TenantId == Guid.Empty)
                {
                    entry.Entity.TenantId = tenantId.Value;
                }
            }
        }
    }
}
