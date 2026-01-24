using System;

namespace POS.Data.Dto
{
    public class LanguageDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Code { get; set; }
        public string ImageUrl { get; set; }
        public bool Isrtl { get; set; }
        public int Order { get; set; } 
        public string Codes { get; set; }
    }
}
