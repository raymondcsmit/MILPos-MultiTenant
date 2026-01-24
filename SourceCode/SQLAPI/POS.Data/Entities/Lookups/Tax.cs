using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data
{
    public class Tax : BaseEntity
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal Percentage { get; set; }
        public string InPutAccountCode { get; set; }
        public string OutPutAccountCode { get; set; }
    }
}
