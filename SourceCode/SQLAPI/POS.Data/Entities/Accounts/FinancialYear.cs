using System;

namespace POS.Data.Entities.Accounts
{
    public class FinancialYear : BaseEntity
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsClosed { get; set; } = false;
        public DateTime? ClosedDate { get; set; }
        public Guid ClosedBy { get; set; }
    }
}
