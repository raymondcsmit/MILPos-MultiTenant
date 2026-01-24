using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Dto.Acconting
{
    public class PayrollDto
    {
        public Guid Id { get; set; }
        public Guid EmployeeId { get; set; }
        public string EmployeeName {  get; set; }
        public Guid BranchId { get; set; }
        public string BranchName { get; set; }
        public int SalaryMonth { get; set; }
        public decimal MobileBill { get; set; }
        public decimal FoodBill { get; set; }
        public decimal Bonus { get; set; }
        public decimal Commission { get; set; }
        public decimal FestivalBonus { get; set; }
        public decimal TravelAllowance { get; set; }
        public decimal Others { get; set; }
        public decimal BasicSalary { get; set; }
        public decimal Advance { get; set; }
        public decimal TotalSalary { get; set; }
        public PaymentMode PaymentMode { get; set; }
        public string ChequeNo { get; set; }
        public DateOnly SalaryDate { get; set; }
        public string Note { get; set; }
        public string Attachment { get; set; }
        public Guid FinancialYearId { get; set; }
    }
}
