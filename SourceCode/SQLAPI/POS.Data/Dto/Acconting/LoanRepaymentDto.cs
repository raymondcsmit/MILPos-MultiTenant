using POS.Data.Entities.Accounts;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Dto.Acconting
{
    public class LoanRepaymentDto
    {
        public Guid Id { get; set; }
        public Guid LoanDetailId { get; set; }
        public string LenderName { get; set; }
        public LoanDetail LoanDetail { get; set; }
        public decimal PrincipalAmount { get; set; }
        public decimal InterestAmount { get; set; }
        public DateTime PaymentDate { get; set; }
        public string Note { get; set; }
    }
}
