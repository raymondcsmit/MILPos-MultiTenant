using System;

namespace POS.Data.Entities
{
    public class Language : BaseEntity
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Code { get; set; }
        public string ImageUrl { get; set; }
        public bool Isrtl { get; set; }
        public int Order { get; set; }
    }
}
