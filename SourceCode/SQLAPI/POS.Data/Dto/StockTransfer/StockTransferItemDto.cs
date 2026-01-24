using System;

namespace POS.Data.Dto
{
    public class StockTransferItemDto
    {
        public Guid Id { get; set; }
        public Guid StockTransferId { get; set; }
        public Guid ProductId { get; set; }
        public string ProductName { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal ShippingCharge { get; set; }
        public decimal SubTotal { get; set; }
        public Guid UnitId { get; set; }
        public string UnitName { get; set; } // Optional: Name instead of full entity
        public ProductDto Product { get; set; }
    }
}
