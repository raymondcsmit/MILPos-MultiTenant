using System;
using System.Collections.Generic;
using POS.Data.Dto.Acconting;

namespace POS.Data.Dto;

public class CompanyProfileDto
{
    public Guid? Id { get; set; }
    public string Title { get; set; }
    public string Address { get; set; }
    public string LogoUrl { get; set; }
    public string Phone { get; set; }
    public string Email { get; set; }
    public string CurrencyCode { get; set; }
    public string TaxNumber { get; set; }
    public string TaxName { get; set; }
    public string LicenseKey { get; set; } = string.Empty;
    public string PurchaseCode { get; set; } = string.Empty;
    public BusinessType BusinessType { get; set; }

    public List<LanguageDto> Languages { get; set; } = [];
    public List<LocationDto> Locations { get; set; } = [];
    public List<FinancialYearDto> FinancialYears { get; set; } = [];

}
