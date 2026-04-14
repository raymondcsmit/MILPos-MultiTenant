using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data.Entities.Accounts;
public class StockAdjustment : BaseEntity
{
    public Guid InventoryItemId { get; set; }

    public Guid BranchId { get; set; }

    public StockAdjustmentType AdjustmentType { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal Quantity { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal UnitCost { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalValue { get; set; }

    [MaxLength(500)]
    public string Reason { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Reference { get; set; } = string.Empty;

    public DateTime AdjustmentDate { get; set; }

    // Navigation Properties
    [ForeignKey("InventoryItemId")]
    public virtual Product InventoryItem { get; set; } = null!;
    [ForeignKey("BranchId")]
    public virtual Location Branch { get; set; } = null!;
}
