using System;
using MediatR;
using Microsoft.AspNetCore.Http;
using POS.Data.Dto.Acconting;
using POS.Data.Entities.Accounts;
using POS.Helper;

namespace POS.MediatR.Accouting
{
    public class  AddPayrollCommand : IRequest<ServiceResponse<PayrollDto>>
    {
        public IFormFile File { get; set; }
        public Guid EmployeeId { get; set; }
        public Guid BranchId { get; set; }
        public int SalaryMonth { get; set; }
        public decimal? MobileBill { get; set; }
        public decimal? FoodBill { get; set; }
        public decimal? Bonus { get; set; }
        public decimal? Commission { get; set; }
        public decimal? FestivalBonus { get; set; }
        public decimal? TravelAllowance { get; set; }
        public decimal? Others { get; set; }
        public decimal? BasicSalary { get; set; }
        public decimal? Advance { get; set; }
        public decimal TotalSalary { get; set; }
        public PaymentMode PaymentMode { get; set; }
        public string ChequeNo { get; set; }
        public DateOnly SalaryDate { get; set; }
        public string Note { get; set; }
        public string Attachment { get; set; }
    }
}
