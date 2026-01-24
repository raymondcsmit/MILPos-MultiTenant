using System;

namespace POS.Data.Dto
{
    public class DamagedStockItemDto
    {
        public Guid ProductId { get; set; }
        public decimal DamagedQuantity { get; set; }
        public Guid UnitId { get; set; }
    }
}
