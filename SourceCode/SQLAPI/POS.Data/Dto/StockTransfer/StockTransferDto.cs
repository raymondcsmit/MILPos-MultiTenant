using System;
using System.Collections.Generic;
using POS.Data.Enums;

namespace POS.Data.Dto
{
    public class StockTransferDto
    {
        public Guid Id { get; set; }
        public DateTime TransferDate { get; set; }
        public string ReferenceNo { get; set; }
        public StockTransferStatus Status { get; set; }
        public Guid FromLocationId { get; set; }
        public string FromLocationName { get; set; } // Optional: Name instead of full entity
        public Guid ToLocationId { get; set; }
        public string ToLocationName { get; set; } // Optional: Name instead of full entity
        public decimal TotalShippingCharge { get; set; }
        public decimal TotalAmount { get; set; }
        public string Notes { get; set; }
        public List<StockTransferItemDto> StockTransferItems { get; set; }
        public LocationDto FromLocation { get; set; }
        public LocationDto ToLocation { get; set; }
    }
}
