using System;

namespace POS.Domain.ImportExport.DTOs
{
    public class ProductImportDto
    {
        public string Code { get; set; }
        public string Name { get; set; }
        public string Barcode { get; set; }
        public string SkuCode { get; set; }
        public string SkuName { get; set; }
        public string Description { get; set; }
        public string Category { get; set; }
        public string Brand { get; set; }
        public string Unit { get; set; }
        public decimal? PurchasePrice { get; set; }
        public decimal? SalesPrice { get; set; }
        public decimal? Mrp { get; set; }
        public decimal? Margin { get; set; }
        public decimal? TaxAmount { get; set; }
        public decimal? AlertQuantity { get; set; }
    }
}
