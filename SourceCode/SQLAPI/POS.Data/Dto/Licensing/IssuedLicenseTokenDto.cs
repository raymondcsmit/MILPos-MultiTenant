using System;

namespace POS.Data.Dto.Licensing
{
    public class IssuedLicenseTokenDto
    {
        public Guid TenantId { get; set; }
        public string Plan { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public int? MaxUsers { get; set; }
        public string Token { get; set; }
        public string TokenId { get; set; }
    }
}

