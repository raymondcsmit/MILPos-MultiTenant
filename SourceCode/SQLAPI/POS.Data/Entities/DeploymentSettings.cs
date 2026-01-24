using System.Collections.Generic;

namespace POS.Data.Entities
{
    public class DeploymentSettings
    {
        public string DeploymentMode { get; set; } // "Desktop" or "Cloud"
        public string DatabaseProvider { get; set; } // "Sqlite" or "SqlServer"
        public bool IsDesktop => DeploymentMode == "Desktop";
        public bool IsCloud => DeploymentMode == "Cloud";
        public MultiTenancySettings MultiTenancy { get; set; }
        public DesktopSettings DesktopSettings { get; set; }
        public CloudSettings CloudSettings { get; set; }
    }

    public class MultiTenancySettings
    {
        public bool Enabled { get; set; }
        public string Mode { get; set; } // "SingleTenant" or "MultiTenant"
        public string TenantResolutionStrategy { get; set; } // "Subdomain", "Header", "Claim"
        public bool AllowTenantSwitching { get; set; }
    }

    public class DesktopSettings
    {
        public bool EnableAutoUpdate { get; set; }
        public string UpdateCheckUrl { get; set; }
        public string DataDirectory { get; set; }
        public bool EnableOfflineMode { get; set; }
        public string WindowTitle { get; set; }
        public bool MinimizeToTray { get; set; }
    }

    public class CloudSettings
    {
        public List<string> CorsOrigins { get; set; }
        public bool EnableCdn { get; set; }
        public string CdnUrl { get; set; }
        public bool EnableRateLimiting { get; set; }
        public int MaxRequestsPerMinute { get; set; }
    }
}
