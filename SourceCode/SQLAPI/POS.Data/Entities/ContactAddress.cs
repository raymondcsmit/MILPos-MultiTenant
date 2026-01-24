using System;

namespace POS.Data.Entities
{
    public class ContactAddress
    {
        public Guid Id { get; set; }
        public string ContactPerson { get; set; }
        public string MobileNo { get; set; }
        public string Address { get; set; }
        public string CountryName { get; set; }
        public string CityName { get; set; }
        public Guid? CountryId { get; set; }
        public Guid? CityId { get; set; }
        public bool IsDeleted { get; set; }
    }
}
