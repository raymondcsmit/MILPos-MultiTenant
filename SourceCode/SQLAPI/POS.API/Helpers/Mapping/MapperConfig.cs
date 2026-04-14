using AutoMapper;

namespace POS.API.Helpers.Mapping
{
    public static class MapperConfig
    {
        public static IMapper GetMapperConfigs()
        {
            var mappingConfig = new MapperConfiguration(mc =>
            {
                mc.AddProfile(new ActionProfile());
                mc.AddProfile(new PageProfile());
                mc.AddProfile(new RoleProfile());
                mc.AddProfile(new UserProfile());
                mc.AddProfile(new NLogProfile());
                mc.AddProfile(new EmailTemplateProfile());
                mc.AddProfile(new EmailProfile());
                mc.AddProfile(new CountryProfile());
                mc.AddProfile(new CustomerProfile());
                mc.AddProfile(new CityProfile());
                mc.AddProfile(new SupplierProfile());
                mc.AddProfile(new ContactUsMapping());

                mc.AddProfile(new ReminderProfile());
                mc.AddProfile(new PurchaseOrderProfile());
                mc.AddProfile(new SalesOrderProfile());

                mc.AddProfile(new CompanyProfileProfile());
                mc.AddProfile(new ExpenseProfile());
                mc.AddProfile(new CurrencyProfile());
                mc.AddProfile(new UnitProfile());
                mc.AddProfile(new TaxProfile());


                mc.AddProfile(new InquiryNoteProfile());
                mc.AddProfile(new InquiryActivityProfile());
                mc.AddProfile(new InquiryAttachmentProfile());
                mc.AddProfile(new InquiryProfile());
                mc.AddProfile(new InquiryStatusProfile());
                mc.AddProfile(new InquirySourceProfile());

                mc.AddProfile(new ProductCategoryProfile());
                mc.AddProfile(new ProductProfile());

                mc.AddProfile(new BrandProfile());


                mc.AddProfile(new VariantProfile());
                mc.AddProfile(new LanguageProfile());
                mc.AddProfile(new PageHelperProfile());
                mc.AddProfile(new LocationProfile());
                mc.AddProfile(new ContactAddressProfile());

                mc.AddProfile(new StockTransferProfile());
                mc.AddProfile(new TableSettingProfile());
                mc.AddProfile(new DamagedStockProfile());
                mc.AddProfile(new TransactionItemProfile());
                mc.AddProfile(new FinancialYearProfile());
                mc.AddProfile(new CustomerLedgerProfile());
                mc.AddProfile(new PayrollProfile());
                mc.AddProfile(new ProductStockProfile());
                mc.AddProfile(new LoanDetailProfile());
                mc.AddProfile(new LedgerAccountProfile());
                mc.AddProfile(new MenuItemProfile());
            });
            return mappingConfig.CreateMapper();
        }
    }
}
