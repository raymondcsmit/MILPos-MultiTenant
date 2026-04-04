using System;

namespace POS.Common.Services
{
    public interface ILicenseTokenService
    {
        string IssueToken(Guid tenantId, string plan, DateTime? expiresAt, int? maxUsers, string tokenId);
        bool TryValidateToken(string token, out LicenseTokenPayload payload, out string error);
    }

    public sealed class LicenseTokenPayload
    {
        public Guid TenantId { get; init; }
        public string Plan { get; init; }
        public DateTime? ExpiresAt { get; init; }
        public int? MaxUsers { get; init; }
        public string TokenId { get; init; }
    }
}

