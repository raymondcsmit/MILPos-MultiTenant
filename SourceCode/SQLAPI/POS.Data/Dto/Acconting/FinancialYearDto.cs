using System;

namespace POS.Data.Dto.Acconting
{
    public class FinancialYearDto
    {
        public Guid Id { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsClosed { get; set; }
        public DateTime? ClosedDate { get; set; }
        public string ClosedByName {  get; set; }
    }
}
