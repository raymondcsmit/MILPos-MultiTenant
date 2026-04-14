using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using POS.Data.Entities;


namespace POS.Data
{
    public class Product : BaseEntity
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Code { get; set; }
        public string Barcode { get; set; }
        public string SkuCode { get; set; }
        public string SkuName { get; set; }
        public string Description { get; set; }
        public string ProductUrl { get; set; }
        public Guid UnitId { get; set; }
        [ForeignKey("UnitId")]
        public UnitConversation Unit { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal? PurchasePrice { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal Margin { get; set; }
        public bool IsMarginIncludeTax { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal? SalesPrice { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal? Mrp { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal? TaxAmount { get; set; }
        public Guid CategoryId { get; set; }
        [ForeignKey("CategoryId")]
        public ProductCategory ProductCategory { get; set; }
        public Guid? BrandId { get; set; }
        [ForeignKey("BrandId")]
        public Brand Brand { get; set; }
        public bool HasVariant { get; set; }
        public Guid? ParentId { get; set; }
        [ForeignKey("ParentId")]
        public Product ParentProduct { get; set; }
        public Guid? VariantId { get; set; }
        [ForeignKey("VariantId")]
        public Variant Variant { get; set; }
        public Guid? VariantItemId { get; set; }
        [ForeignKey("VariantItemId")]
        public VariantItem VariantItem { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal? AlertQuantity { get; set; }
        public List<ProductTax> ProductTaxes { get; set; }
        public ICollection<Product> ProductVariants { get; set; }
        public List<ProductStock> ProductStocks { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal CurrentStock { get; set; } = 0;

    }
}
