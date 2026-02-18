using System;

namespace POS.Data.Dto
{
    public class MasterTenantSettings
    {
        public Guid TenantId { get; set; }
        public string TenantName { get; set; }
        public string SubDomain { get; set; }
        public bool IsMasterTenant { get; set; }
        public string AdminUser { get; set; }
        public string AdminPassword { get; set; }
        public string ApiKey { get; set; }
        public string ApiSecret { get; set; }
        public string ApiUrl { get; set; }
    }
}
