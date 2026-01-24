using System;
using System.ComponentModel.DataAnnotations.Schema;


namespace POS.Data.Entities
{
    public class StockTransferItem : BaseEntity
    {
        public Guid Id { get; set; }
        public Guid StockTransferId { get; set; }
        [ForeignKey("StockTransferId")]
        public StockTransfer StockTransfer { get; set; }
        public Guid ProductId { get; set; }
        public Product Product { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal Quantity { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal UnitPrice { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal ShippingCharge { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal SubTotal { get; set; }
        public Guid? UnitId { get; set; }
        [ForeignKey("UnitId")]
        public UnitConversation Unit { get; set; }

    }

}
