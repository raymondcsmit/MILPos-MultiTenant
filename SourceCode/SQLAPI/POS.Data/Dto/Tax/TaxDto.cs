
using System;

namespace POS.Data.Dto
{
    public class TaxDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public decimal Percentage { get; set; }
        public string InPutAccountCode { get; set; }
        public string OutPutAccountCode { get; set; }
    }
}
