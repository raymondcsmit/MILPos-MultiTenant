using System;

namespace POS.Data.Dto
{
    public class ProductTaxDto
    {
        public Guid? ProductId { get; set; }
        public Guid TaxId { get; set; }
        public TaxDto Tax { get; set; }
    }
}
