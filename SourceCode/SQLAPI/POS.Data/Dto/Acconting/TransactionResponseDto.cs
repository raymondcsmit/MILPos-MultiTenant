using POS.Data.Entities.Accounts;
using System;
using System.Collections.Generic;

namespace POS.Data.Dto;
public class CreateTransactionDto
{
    public TransactionType TransactionType { get; set; }
    public Guid BranchId { get; set; }
    public DateTime TransactionDate { get; set; }
    public string Narration { get; set; } = string.Empty;
    public string ReferenceNumber { get; set; } = string.Empty;
    public decimal FlatDiscount { get; set; }
    public List<TransactionItemDto> Items { get; set; } = new();
    public decimal RoundOffAmount { get; set; }
}

public class TransactionItemDto
{
    public Guid InventoryItemId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountPercentage { get; set; }
    public decimal TaxPercentage { get; set; }
    public string DiscountType { get; set; }
    public Guid UnitId { get; set; }
    public decimal PurchasePrice { get; set; }
    public List<Guid> TaxIds { get; set; } = [];
    public TransactionItemTax TransactionItemTax { get; set; }
}

public class TransactionResponseDto
{
    public Guid TransactionId { get; set; }
    public string TransactionNumber { get; set; } = string.Empty;
    public TransactionType TransactionType { get; set; }
    public Guid BranchId { get; set; }
    public DateTime TransactionDate { get; set; }
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal RoundOffAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string Narration { get; set; } = string.Empty;
    public TransactionStatus Status { get; set; }
}

public class StockAdjustmentDto
{
    public Guid InventoryItemId { get; set; }
    public Guid BranchId { get; set; }
    public StockAdjustmentType AdjustmentType { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Reference { get; set; } = string.Empty;
}