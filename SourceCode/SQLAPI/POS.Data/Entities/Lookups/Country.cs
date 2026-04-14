using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data
{
    public class Country : SharedBaseEntity
    {
        public string CountryName { get; set; }
    }
}
