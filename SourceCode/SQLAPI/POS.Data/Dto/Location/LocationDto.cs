using System;
using System.Collections.Generic;
using POS.Data.Entities;

namespace POS.Data.Dto
{
    public class LocationDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Address { get; set; }
        public string Email { get; set; }
        public string Mobile { get; set; }
        public string ContactPerson { get; set; }
        public string Website { get; set; }
        public string FBRKey { get; set; }
        public string POSID { get; set; }
        public string ApiBaseUrl { get; set; }
        public bool IsFBREnabled { get; set; }
        public bool AutoSubmitInvoices { get; set; }
        public virtual ICollection<UserLocation> UserLocations { get; set; }
    }
}
