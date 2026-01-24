using System;
using System.Collections;
using System.Collections.Generic;

namespace POS.Data.Entities
{
    public class Location: BaseEntity
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Address { get; set; }
        public string Email { get; set; }
        public string Mobile { get; set; }
        public string ContactPerson { get; set; }
        public string Website { get; set; }
        public virtual ICollection<UserLocation> UserLocations { get; set; }
    }
}
