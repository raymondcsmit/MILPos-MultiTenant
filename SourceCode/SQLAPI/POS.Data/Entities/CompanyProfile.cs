using System;

namespace POS.Data;

public class CompanyProfile : BaseEntity
{
    public Guid Id { get; set; }
    public string Title { get; set; }
    public string Address { get; set; }
    public string LogoUrl { get; set; }
    public string Phone { get; set; }
    public string Email { get; set; }
    public string TaxName { get; set; }
    public string TaxNumber { get; set; }
    public string CurrencyCode { get; set; }
    public string LicenseKey { get; set; } = string.Empty;
    public string PurchaseCode { get; set; } = string.Empty;
}
