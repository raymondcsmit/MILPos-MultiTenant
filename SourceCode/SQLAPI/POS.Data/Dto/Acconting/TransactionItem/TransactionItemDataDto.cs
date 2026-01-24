using System;

namespace POS.Data.Dto.Acconting
{
    public class TransactionItemDataDto
    {
        public Guid Id { get; set; }
        public Guid TransactionId { get; set; }
        public string ProductName { get; set; }
        public Guid InventoryItemId { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal DiscountPercentage { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxPercentage { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal LineTotal { get; set; }
        public Guid UnitId { get; set; }
        public string DiscountType { get; set; }
        //public UnitConversation Unit { get; set; }
        //public virtual TransactionItemDto Transaction { get; set; }
        //public virtual ProductDto InventoryItem { get; set; } 
        //public List<Guid> TaxIds { get; set; } = [];
    }
}
