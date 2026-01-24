using System;

namespace POS.Data.Dto
{
    public class CustomerLedgerDto
    {
        public Guid Id { get; set; }
        public DateTime Date { get; set; }
        public Guid? AccountId { get; set; }
        public Guid? CustomerId { get; set; }
        public string CustomerName { get; set; }
        public string AccountName { get; set; }
        public Guid LocationId { get; set; }
        public string LocationName { get; set; }
        public string Description { get; set; }
        public decimal Amount { get; set; }
        public decimal Balance { get; set; }
        public decimal Overdue { get; set; }
        public string Reference { get; set; }
        public string? Note { get; set; }
    }
}
