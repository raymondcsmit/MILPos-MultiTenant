using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data.Entities.Accounts;
public class TransactionItem
{
    public Guid Id { get; set; }
    public Guid TransactionId { get; set; }
    public Guid InventoryItemId { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal Quantity { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal UnitPrice { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal DiscountPercentage { get; set; }
    public string DiscountType { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal DiscountAmount { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal TaxPercentage { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal TaxAmount { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal LineTotal { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal PurchasePrice { get; set; }
    public Guid UnitId { get; set; }
    [ForeignKey("UnitId")]
    public UnitConversation Unit { get; set; }
    // Navigation Properties
    [ForeignKey("TransactionId")]
    public virtual Transaction Transaction { get; set; } = null!;
    [ForeignKey("InventoryItemId")]
    public virtual Product InventoryItem { get; set; } = null!;
    //public List<Guid> TaxIds { get; set; } = [];
    public ICollection<TransactionItemTax> TransactionItemTaxes { get; set; } = new List<TransactionItemTax>();

}
public class TransactionItemTax
{
    public Guid TransactionItemId { get; set; }
    [ForeignKey("TransactionItemId")]
    public TransactionItem TransactionItem { get; set; }
    public Guid TaxId { get; set; }
    [ForeignKey("TaxId")]
    public Tax Tax { get; set; }
}

