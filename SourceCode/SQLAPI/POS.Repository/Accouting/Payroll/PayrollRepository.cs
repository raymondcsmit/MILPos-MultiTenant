using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data.Dto.Acconting;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Data.Resources;
using POS.Domain;
using POS.Helper;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace POS.Repository.Accouting;
public class PayrollRepository(IUnitOfWork<POSDbContext> uow,
    IPropertyMappingService _propertyMappingService) : GenericRepository<Payroll, POSDbContext>(uow), IPayrollRepository
{
    public async Task<PayrollList> GetPayrolls(PayrollResource payrollResource)
    {
        var collectionBeforePaging = All.Include(c=>c.Employee).Include(c=>c.Location).AsQueryable();
        collectionBeforePaging = collectionBeforePaging.ApplySort(payrollResource.OrderBy,
        _propertyMappingService.GetPropertyMapping<PayrollDto, Payroll>());

        if (!string.IsNullOrWhiteSpace(payrollResource.BranchName))
        {
            var branchName = payrollResource.BranchName.Trim().ToLower();
            collectionBeforePaging = collectionBeforePaging
                .Where(a => EF.Functions.Like(a.Location.Name.ToLower(), $"%{branchName}%"));
        }
        if (!string.IsNullOrWhiteSpace(payrollResource.EmployeeName))
        {
            var employeeName = payrollResource.EmployeeName.Trim().ToLower();
            collectionBeforePaging = collectionBeforePaging
                .Where(a => EF.Functions.Like(a.Employee.FirstName.ToLower(), $"%{employeeName}%"));
        }
        if (payrollResource.EmployeeId.HasValue)
        {
            collectionBeforePaging = collectionBeforePaging.Where(c => c.Employee.Id == payrollResource.EmployeeId.Value);
        }
        if (payrollResource.BranchId.HasValue)
        {
            collectionBeforePaging = collectionBeforePaging.Where(c => c.Location.Id == payrollResource.BranchId.Value);
        }
        if (payrollResource.SalaryMonth.HasValue)
        {
            collectionBeforePaging = collectionBeforePaging.Where(c => c.SalaryMonth == payrollResource.SalaryMonth.Value);
        }
        if (payrollResource.PaymentMode.HasValue)
        {
            collectionBeforePaging = collectionBeforePaging.Where(c => c.PaymentMode == payrollResource.PaymentMode.Value);
        }
        if (payrollResource.FromDate.HasValue && payrollResource.ToDate.HasValue)
        {
            var startDate = payrollResource.FromDate.Value.ToLocalTime();
            var endDate = payrollResource.ToDate.Value.ToLocalTime();

            DateOnly minDate = new DateOnly(startDate.Year, startDate.Month, startDate.Day );
            DateOnly maxDate = new DateOnly(endDate.Year, endDate.Month, endDate.Day);

            collectionBeforePaging = collectionBeforePaging
                        .Where(c => c.SalaryDate >= minDate &&
                            c.SalaryDate <= maxDate);
        }


        var payrollList=new PayrollList();
        return await payrollList.Create(
              collectionBeforePaging,
              payrollResource.Skip,
              payrollResource.PageSize);
    }


}


