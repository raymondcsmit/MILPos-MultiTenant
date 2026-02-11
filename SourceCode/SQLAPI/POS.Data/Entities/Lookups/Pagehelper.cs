using System;

namespace POS.Data.Entities
{
    public class PageHelper : SharedBaseEntity
    {
        public string Code { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
    }
}
