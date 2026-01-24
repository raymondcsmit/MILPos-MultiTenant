using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.MediatR.SalesOrder.Commands;
using POS.Repository;

namespace POS.MediatR.SalesOrder.Handlers
{
    public class GetSalesOrderTaxItemCommandHandler(
       ISalesOrderItemTaxRepository salesOrderItemTaxRepository)
       : IRequestHandler<GetSalesOrderTaxItemCommand, List<SalesOrderItemTaxDto>>
    {
        public async Task<List<SalesOrderItemTaxDto>> Handle(GetSalesOrderTaxItemCommand request, CancellationToken cancellationToken)
        {
            var report = await salesOrderItemTaxRepository.All
                .Include(d => d.SalesOrderItem)
                .Include(x => x.Tax)
                .Where(x => x.SalesOrderItem.SalesOrderId == request.Id)
                .GroupBy(d => d.TaxId)
                .Select(x => new SalesOrderItemTaxDto
                {
                    TaxName = x.FirstOrDefault().Tax.Name,
                    TaxValue = x.Sum(x => x.SalesOrderItem.Status == PurchaseSaleItemStatusEnum.Return ? (-1 * x.TaxValue) : x.TaxValue)
                }).ToListAsync();
            return report;
        }
    }
}
