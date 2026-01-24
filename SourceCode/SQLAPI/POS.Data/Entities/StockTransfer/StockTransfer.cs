using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using POS.Data.Enums;


namespace POS.Data.Entities
{
    public class StockTransfer : BaseEntity
    {
        public Guid Id { get; set; }
        public DateTime TransferDate { get; set; }
        public string ReferenceNo { get; set; }
        public StockTransferStatus Status { get; set; }
        public Guid FromLocationId { get; set; }
        [ForeignKey("FromLocationId")]
        public Location FromLocation { get; set; }
        public Guid ToLocationId { get; set; }
        [ForeignKey("ToLocationId")]
        public Location ToLocation { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalShippingCharge { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }
        public string Notes { get; set; }
        public ICollection<StockTransferItem> StockTransferItems { get; set; }
    }
}
