using POS.Data.Entities;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Dto
{
    public class ProductStockDto
    {
        //public Guid Id { get; set; }
        //public decimal CurrentStock { get; set; }
        //public decimal PurchasePrice { get; set; }
        //public Guid LocationId { get; set; }
        ////public Location Location { get; set; }
        //public Guid ProductId { get; set; }
        ////public Product Product { get; set; }
        //public DateTime ModifiedDate { get; set; }
        public Guid Id { get; set; }
        public Guid ProductId { get; set; }
        public Guid LocationId { get; set; }
        public decimal Stock { get; set; }
        public decimal PricePerUnit { get; set; }
        public string ProductName { get; set; }
        public string UnitName { get; set; }
        public decimal AveragePurchasePrice { get; set; }
        public decimal AverageSalesPrice { get; set; }
        public InventorySourceEnum InventorySource { get; set; }
        public Guid? PurchaseOrderId { get; set; }
        public Guid? SalesOrderId { get; set; }
        public Guid UnitId { get; set; }
        public decimal TaxValue { get; set; }
        public decimal Discount { get; set; }
        public Guid? StockTransferId { get; set; }
        public Guid? FromLocationId { get; set; }
        public Guid? ToLocationId { get; set; }
        public Guid? DamagedStockId { get; set; }
    }
}
