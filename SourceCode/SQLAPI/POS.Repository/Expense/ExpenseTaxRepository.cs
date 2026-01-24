using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Data.Resources;
using POS.Domain;

namespace POS.Repository
{
    public class ExpenseTaxRepository : GenericRepository<ExpenseTax, POSDbContext>,
          IExpenseTaxRepository
    {
        private readonly UserInfoToken _userInfoToken;
        public ExpenseTaxRepository(
            IUnitOfWork<POSDbContext> uow,
            UserInfoToken userInfoToken
            ) : base(uow)
        {
            _userInfoToken = userInfoToken;
        }

        public async Task<List<ExpenseTaxDto>> GetTaxTotal(ExpenseResource expenseResource)
        {
            var query = AllIncluding(c => c.Tax);

            if (expenseResource.FromDate.HasValue)
            {
                query = query.Where(c => c.Expense.CreatedDate >= expenseResource.FromDate);
            }

            if (expenseResource.ToDate.HasValue)
            {
                var toDate = expenseResource.ToDate.Value.AddDays(1);
                query = query.Where(c => c.Expense.CreatedDate < toDate);
            }

            if (expenseResource.LocationId.HasValue)
            {
                query = query.Where(c => c.Expense.LocationId == expenseResource.LocationId);
            }
            else
            {
                query = query.Where(c => _userInfoToken.LocationIds.Contains(c.Expense.LocationId));
            }

            var data = await query.GroupBy(c => c.TaxId).Select(d => new ExpenseTaxDto
            {
                TaxId = d.Key,
                TaxName = d.FirstOrDefault().Tax.Name,
                TaxValue = d.Sum(c => c.TaxValue)
            }).ToListAsync();

            return data;
        }
    }
}