using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data.Entities;
public class ProductStock
{
    public Guid Id { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal CurrentStock { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal PurchasePrice { get; set; }
    public Guid LocationId { get; set; }
    [ForeignKey("LocationId")]
    public Location Location { get; set; }
    public Guid ProductId { get; set; }
    [ForeignKey("ProductId")]
    public Product Product { get; set; }
    public DateTime ModifiedDate { get; set; }
}
