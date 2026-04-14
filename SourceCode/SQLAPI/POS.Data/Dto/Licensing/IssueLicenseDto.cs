using System;

namespace POS.Data.Dto.Licensing
{
    public class IssueLicenseDto
    {
        public string Plan { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public int? MaxUsers { get; set; }
    }
}

