using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.Repository;

namespace POS.MediatR
{
    public class GetExpenseTaxTotalCommandHandler(
        IExpenseTaxRepository expenseTaxRepository)
        : IRequestHandler<GetExpenseTaxTotalCommand, List<ExpenseTaxDto>>
    {
        public async Task<List<ExpenseTaxDto>> Handle(GetExpenseTaxTotalCommand request, CancellationToken cancellationToken)
        {
            var item = await expenseTaxRepository.GetTaxTotal(request.ExpenseResource);
            return item;
        }
    }
}
