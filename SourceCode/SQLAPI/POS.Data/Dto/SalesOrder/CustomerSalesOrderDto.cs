using System;

namespace POS.Data.Dto.SalesOrder
{
    public class CustomerSalesOrderDto
    {
        public Guid CustomerId {  get; set; }
        public string CustomerName { get; set; }
        public decimal TotalPendingAmount {  get; set; }
        public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;
    }
}
