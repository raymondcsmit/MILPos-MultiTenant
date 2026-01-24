using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Dto
{
   public class PurchaseOrderDetailDto
    {
        public Guid Id { get; set; }
        public string OrderNumber { get; set; }
        public DateTime POCreatedDate { get; set; }
        public bool IsClosed { get; set; }
        public Guid SupplierId { get; set; }
        public decimal TotalQuantity { get; set; }
        public decimal AvailableQuantity { get; set; }
        public decimal InStockQuantity { get; set; }
        public decimal PricePerUnit { get; set; }
        public decimal Tax { get; set; }
        public string SupplierInvoiceNumber { get; set; }
        public string SupplierName { get; set; }
        public decimal TotalAmount { get; set; }
        public Guid PackagingTypeId { get; set; }
        public SupplierDto Supplier { get; set; }
    }
}
