using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data
{
    public class City : BaseEntity
    {
        public string CityName { get; set; }
        public Guid CountryId { get; set; }
        [ForeignKey("CountryId")]
        public Country Country { get; set; }
    }
}
