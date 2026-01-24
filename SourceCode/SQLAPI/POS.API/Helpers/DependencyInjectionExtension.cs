using Microsoft.Extensions.DependencyInjection;
using POS.Common.UnitOfWork;
using POS.MediatR;
using POS.MediatR.Accouting.Services;
using POS.MediatR.Accouting.Strategies;
using POS.Repository;
using POS.Repository.Accouting;

namespace POS.API.Helpers
{
    public static class DependencyInjectionExtension
    {
        public static void AddDependencyInjection(this IServiceCollection services)
        {
            services.AddScoped(typeof(IUnitOfWork<>), typeof(UnitOfWork<>));
            services.AddScoped<IPropertyMappingService, PropertyMappingService>();
            services.AddScoped<IPageRepository, PageRepository>();
            services.AddScoped<IActionRepository, ActionRepository>();
            services.AddScoped<IRoleRepository, RoleRepository>();
            services.AddScoped<IUserRepository, UserRepository>();
            services.AddScoped<IUserRoleRepository, UserRoleRepository>();
            services.AddScoped<IUserClaimRepository, UserClaimRepository>();
            services.AddScoped<IRoleClaimRepository, RoleClaimRepository>();
            services.AddScoped<ILoginAuditRepository, LoginAuditRepository>();
            services.AddScoped<INLogRepository, NLogRepository>();
            services.AddScoped<IEmailTemplateRepository, EmailTemplateRepository>();
            services.AddScoped<IEmailSMTPSettingRepository, EmailSMTPSettingRepository>();
            services.AddScoped<IProductCategoryRepository, ProductCategoryRepository>();
            services.AddScoped<ICityRepository, CityRepository>();
            services.AddScoped<IContactUsRepository, ContactUsRepository>();
            services.AddScoped<ICountryRepository, CountryRepository>();
            services.AddScoped<ICustomerRepository, CustomerRepository>();
            services.AddScoped<ISupplierRepository, SupplierRepository>();
            services.AddScoped<IReminderNotificationRepository, ReminderNotificationRepository>();
            services.AddScoped<IReminderRepository, ReminderRepository>();
            services.AddScoped<IReminderUserRepository, ReminderUserRepository>();
            services.AddScoped<IReminderSchedulerRepository, ReminderSchedulerRepository>();
            services.AddScoped<IDailyReminderRepository, DailyReminderRepository>();
            services.AddScoped<IQuarterlyReminderRepository, QuarterlyReminderRepository>();
            services.AddScoped<IHalfYearlyReminderRepository, HalfYearlyReminderRepository>();
            services.AddScoped<ISendEmailRepository, SendEmailRepository>();
            // PO
            services.AddScoped<IPurchaseOrderRepository, PurchaseOrderRepository>();
            services.AddScoped<IPurchaseOrderItemRepository, PurchaseOrderItemRepository>();
            services.AddScoped<IPurchaseOrderPaymentRepository, PurchaseOrderPaymentRepository>();
            services.AddScoped<IPurchaseOrderItemTaxRepository, PurchaseOrderItemTaxRepository>();
            //SO
            services.AddScoped<ISalesOrderRepository, SalesOrderRepository>();
            services.AddScoped<ISalesOrderItemRepository, SalesOrderItemRepository>();
            services.AddScoped<ISalesOrderItemTaxRepository, SalesOrderItemTaxRepository>();
            services.AddScoped<ISalesOrderPaymentRepository, SalesOrderPaymentRepository>();

            services.AddScoped<ICompanyProfileRepository, CompanyProfileRepository>();
            services.AddScoped<IExpenseCategoryRepository, ExpenseCategoryRepository>();
            services.AddScoped<IExpenseRepository, ExpenseRepository>();
            services.AddScoped<IProductRepository, ProductRepository>();
            services.AddScoped<IProductTaxRepository, ProductTaxRepository>();
            services.AddScoped<ITaxRepository, TaxRepository>();
            services.AddScoped<ICurrencyRepository, CurrencyRepository>();
            services.AddScoped<IInquiryRepository, InquiryRepository>();
            services.AddScoped<IInquiryProductRepository, InquiryProductRepository>();
            services.AddScoped<IInquiryStatusRepository, InquiryStatusRepository>();
            services.AddScoped<IInquiryNoteRepository, InquiryNoteRepository>();
            services.AddScoped<IInquiryAttachmentRepository, InquiryAttachmentRepository>();
            services.AddScoped<IInquiryActivityRepository, InquiryActivityRepository>();
            services.AddScoped<IInquirySourceRepository, InquirySourceRepository>();

            services.AddScoped<IBrandRepository, BrandRepository>();

            services.AddScoped<IUnitConversationRepository, UnitConversationRepository>();

            services.AddScoped<IVariantRepository, VariantRepository>();
            services.AddScoped<IVariantItemRepository, VariantItemRepository>();

            services.AddScoped<ILanguageRepository, LanguageRepository>();
            services.AddScoped<IPageHelperRepository, PageHelperRepository>();
            services.AddScoped<ILocationRepository, LocationRepository>();
            services.AddScoped<IEmailLogRepository, EmailLogRepository>();
            services.AddScoped<IEmailLogAttachmentRepository, EmailLogAttachmentRepository>();
            services.AddScoped<IStockTransferRepository, StockTransferRepository>();

            services.AddScoped<IUserLocationsRepository, UserLocationsRepository>();
            services.AddScoped<IStockTransferItemRepository, StockTransferItemRepository>();
            services.AddScoped<IContactAddressRepository, ContactAddressRepository>();
            services.AddScoped<IExpenseTaxRepository, ExpenseTaxRepository>();
            services.AddScoped<IDamagedStockRepository, DamagedStockRepository>();

            //services.AddScoped<EmailHelper, EmailHelper>();
            services.AddScoped<ITableSettingRepository, TableSettingRepository>();
            services.AddScoped<IEmailRepository, EmailRepository>();

            //Accounting
            services.AddScoped<IAccountingEntryRepository, AccountingEntryRepository>();
            services.AddScoped<ILedgerAccountRepository, LedgerAccountRepository>();
            services.AddScoped<IPaymentEntryRepository, PaymentEntryRepository>();
            services.AddScoped<ITaxEntryRepository, TaxEntryRepository>();
            services.AddScoped<ITransactionItemRepository, TransactionItemRepository>();
            services.AddScoped<ITransactionRepository, TransactionRepository>();
            services.AddScoped<IStockAdjustmentRepository, StockAdjustmentRepository>();
            //Accounting Services
            services.AddScoped<IAccountingService, AccountingService>();
            services.AddScoped<IInventoryService, InventoryService>();
            services.AddScoped<IPaymentService, PaymentService>();
            services.AddScoped<ITaxService, TaxService>();
            // Accouting Stategy Patterns
            services.AddScoped<IExpenseStrategy, ExpenseStrategy>();
            services.AddScoped<IFullPaymentStrategy, FullPaymentStrategy>();
            services.AddScoped<IPartialPaymentStrategy, PartialPaymentStrategy>();
            services.AddScoped<IPurchaseReturnStrategy, PurchaseReturnStrategy>();
            services.AddScoped<IPurchaseStrategy, PurchaseStrategy>();
            services.AddScoped<ISaleReturnStrategy, SaleReturnStrategy>();
            services.AddScoped<ISaleStrategy, SaleStrategy>();
            services.AddScoped<IStockAdjustmentStrategy, StockAdjustmentStrategy>();
            services.AddScoped<ITransactionStrategyFactory, TransactionStrategyFactory>();
            services.AddScoped<IAccountingEntryFactory, AccountingEntryFactory>();
            services.AddScoped<IPaymentStrategyFactory, PaymentStrategyFactory>();
            services.AddScoped<IProductStockRepository, ProductStockRepository>();
            services.AddScoped<IPayrollStrategy, PayrollStrategy>();
            services.AddScoped<ICustomerLedgerRepository, CustomerLedgerRepository>();
            services.AddScoped<ILoanStrategy, LoanStrategy>();
            //Financial Year
            services.AddScoped<IFinancialYearRepository, FinancialYearRepository>();
            //Payroll 
            services.AddScoped<IPayrollRepository, PayrollRepository>();
            //Loan
            services.AddScoped<ILoanDetailRepository, LoanDetailRepository>();
            services.AddScoped<ILoanRepaymentRepository, LoanRepaymentRepository>();


        }
    }
}
