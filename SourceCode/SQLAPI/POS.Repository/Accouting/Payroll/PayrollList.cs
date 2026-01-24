using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto.Acconting;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Helper;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Repository.Accouting
{
    public class PayrollList : List<PayrollDto>
    {
        public int Skip { get; private set; }
        public int TotalPages { get; private set; }
        public int PageSize { get; private set; }
        public int TotalCount { get; private set; }
        public PayrollList()
        {
        }
        public PayrollList(List<PayrollDto> items, int count, int skip, int pageSize)
        {
            TotalCount = count;
            PageSize = pageSize;
            Skip = skip;
            TotalPages = (int)Math.Ceiling(count / (double)pageSize);
            AddRange(items);
        }
        public async Task<PayrollList> Create(IQueryable<Payroll> source, int skip, int pageSize)
        {
            var count = await GetCount(source);
            var dtoList = await GetDtos(source, skip, pageSize);
            var dtoPageList = new PayrollList(dtoList, count, skip, pageSize);
            return dtoPageList;
        }

        public async Task<int> GetCount(IQueryable<Payroll> source)
        {
            return await source.AsNoTracking().CountAsync();
        }

        public async Task<List<PayrollDto>> GetDtos(IQueryable<Payroll> source, int skip, int pageSize)
        {
            try
            {
                var risk = await source
                    .Skip(skip)
                    .Take(pageSize)
                    .AsNoTracking()
                    .Select(c => new PayrollDto
                    {
                        Id = c.Id,
                        Advance = c.Advance,
                        BasicSalary = c.BasicSalary,
                        Bonus = c.Bonus,
                        Attachment = c.Attachment,
                        BranchId = c.BranchId,
                        ChequeNo = c.ChequeNo,
                        Commission = c.Commission,
                        EmployeeId = c.EmployeeId,
                        FestivalBonus = c.FestivalBonus,
                        FinancialYearId = c.FinancialYearId,
                        FoodBill = c.FoodBill,
                        MobileBill = c.MobileBill,
                        Others = c.Others,
                        PaymentMode = c.PaymentMode,
                        SalaryDate = c.SalaryDate,
                        SalaryMonth = c.SalaryMonth,
                        TotalSalary = c.TotalSalary,
                        Note = c.Note,
                        TravelAllowance = c.TravelAllowance,
                        BranchName=c.Location != null ? c.Location.Name : null,
                        EmployeeName    =c.Employee != null ? c.Employee.FirstName + " " + c.Employee.LastName : null,
                        
                    })
                    .ToListAsync();
                return risk;
            }
            catch (Exception ex)
            {
                throw new DataException("Error while getting LedgerAccount", ex);
            }
        }
    }
}
