using System;
using System.Collections.Generic;
using POS.Data.Entities;

namespace POS.Data.Dto
{
    public class ProductInventoryStockDto
    {
        public string Name { get; set; }
        public Guid Id { get; set; }
        public double? Stock { get; set; }
        public string UnitName { get; set; }
        public List<ProductStock> ProductStocks { get; set; }
        public Guid UnitId { get; set; }
        public Guid? ParentUnitId { get; set; }
    }
}
