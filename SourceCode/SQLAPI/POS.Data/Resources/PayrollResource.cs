using POS.Data.Entities.Accounts;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Resources
{
    public class PayrollResource:ResourceParameter
    {
        public PayrollResource():base("EmployeeName")
        {
            
        }
        public string EmployeeName { get; set; }
        public string BranchName { get; set; }
        public int? SalaryMonth { get; set; }
        public PaymentMode? PaymentMode { get; set; }
        public Guid? EmployeeId { get; set; }
        public Guid? BranchId { get; set; }
        public DateTime? FromDate { get; set; } // SalaryDate
        public DateTime? ToDate { get; set; }   //SalaryDate

    }
}
