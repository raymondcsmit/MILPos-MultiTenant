using System;

namespace POS.Data.Entities.Licensing
{
    public class License : BaseEntity
    {
        public string TokenId { get; set; }
        public string TokenHash { get; set; }
        public string Plan { get; set; }
        public string Status { get; set; }
        public DateTime IssuedAt { get; set; }
        public DateTime? ActivatedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public int? MaxUsers { get; set; }
    }
}
