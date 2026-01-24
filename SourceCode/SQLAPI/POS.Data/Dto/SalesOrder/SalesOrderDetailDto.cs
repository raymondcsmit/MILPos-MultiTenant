using System;


namespace POS.Data.Dto
{
    public class SalesOrderDetailDto
    {
        public Guid Id { get; set; }
        public string OrderNumber { get; set; }
        public DateTime SOCreatedDate { get; set; }
        public bool IsClosed { get; set; }
        public Guid CustomerId { get; set; }
        public decimal TotalQuantity { get; set; }
        public decimal AvailableQuantity { get; set; }
        public decimal InStockQuantity { get; set; }
        public decimal PricePerUnit { get; set; }
        public decimal Tax { get; set; }
        public string CustomerInvoiceNumber { get; set; }
        public string CustomerName { get; set; }
        public decimal TotalAmount { get; set; }
        public CustomerDto Customer { get; set; }
    }
}
