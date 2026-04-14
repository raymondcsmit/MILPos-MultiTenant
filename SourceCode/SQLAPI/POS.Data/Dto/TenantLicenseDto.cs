using System;

namespace POS.Data.Dto
{
    public class TenantLicenseDto
    {
        public Guid TenantId { get; set; }
        public string LicenseKey { get; set; }
        public string PurchaseCode { get; set; }
    }
}
