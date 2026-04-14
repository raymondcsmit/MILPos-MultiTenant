using System;

namespace POS.Data.Dto.Tenant
{
    public class RegisterTenantDto
    {
        public string Name { get; set; }
        public string Subdomain { get; set; }
        public string AdminEmail { get; set; }
        public string AdminPassword { get; set; } = "admin@123";
        public string Phone { get; set; }
        public string Address { get; set; }
        public string BusinessType { get; set; } = "Retail"; // Retail, Pharmacy, Petrol
    }
}
