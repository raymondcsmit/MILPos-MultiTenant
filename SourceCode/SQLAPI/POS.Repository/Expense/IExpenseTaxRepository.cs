using POS.Common.GenericRepository;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Data.Resources;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Repository
{
    public interface IExpenseTaxRepository : IGenericRepository<ExpenseTax>
    {
        public Task<List<ExpenseTaxDto>> GetTaxTotal(ExpenseResource expenseResource);
    }
}
