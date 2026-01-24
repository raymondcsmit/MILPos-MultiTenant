using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Repository;

namespace POS.MediatR.PurchaseOrder.Handlers
{
    public class GetPurchaseOrderTaxItemCommandHandler(
        IPurchaseOrderItemTaxRepository purchaseOrderItemTaxRepository)
        : IRequestHandler<GetPurchaseOrderTaxItemCommand, List<PurchaseOrderItemTaxDto>>
    {
        public async Task<List<PurchaseOrderItemTaxDto>> Handle(GetPurchaseOrderTaxItemCommand request, CancellationToken cancellationToken)
        {
            var report = await purchaseOrderItemTaxRepository.All
                .Include(d => d.PurchaseOrderItem)
                .Include(x => x.Tax)
                .Where(x => x.PurchaseOrderItem.PurchaseOrderId == request.Id)
                .GroupBy(d => d.TaxId)
                .Select(x => new PurchaseOrderItemTaxDto
                {
                    TaxName = x.FirstOrDefault().Tax.Name,
                    TaxValue = x.Sum(x => x.PurchaseOrderItem.Status == PurchaseSaleItemStatusEnum.Return ? (-1 * x.TaxValue) : x.TaxValue)
                }).ToListAsync();
            return report;
        }
    }
}
