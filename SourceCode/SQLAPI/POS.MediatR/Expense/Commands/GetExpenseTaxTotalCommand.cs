using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using POS.Data.Dto;
using POS.Data.Resources;

namespace POS.MediatR
{
    public class GetExpenseTaxTotalCommand : IRequest<List<ExpenseTaxDto>>
    {
        public ExpenseResource ExpenseResource { get; set; }
    }
}
