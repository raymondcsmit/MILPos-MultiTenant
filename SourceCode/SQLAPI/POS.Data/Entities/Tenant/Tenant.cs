using System;

namespace POS.Data.Entities
{
    public class Tenant
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Subdomain { get; set; }
        public string ContactEmail { get; set; }
        public string ContactPhone { get; set; }
        public string Address { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? SubscriptionStartDate { get; set; }
        public DateTime? SubscriptionEndDate { get; set; }
        public string SubscriptionPlan { get; set; }
        public int MaxUsers { get; set; }
        public string ConnectionString { get; set; } // For future database-per-tenant migration
        public string LogoUrl { get; set; }
        public string TimeZone { get; set; }
        public string Currency { get; set; }
    }
}
