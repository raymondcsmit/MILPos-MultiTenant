using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Domain;
using POS.Helper;
using POS.MediatR.CommandAndQuery;
using POS.MediatR;
using POS.MediatR.SalesOrder.Commands;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.PurchaseOrder.Handlers
{
    public class GetPurchaseOrderProfitLossCommandHandler : IRequestHandler<GetPurchaseOrderProfitLossCommand, ProfitLossDto>
    {
        private readonly IPurchaseOrderRepository _purchaseOrderRepository;
        private readonly UserInfoToken _userInfoToken;

        public GetPurchaseOrderProfitLossCommandHandler(
            IPurchaseOrderRepository purchaseOrderRepository, UserInfoToken userInfoToken)
        {
            _purchaseOrderRepository = purchaseOrderRepository;
            _userInfoToken = userInfoToken;
        }

        public async Task<ProfitLossDto> Handle(GetPurchaseOrderProfitLossCommand request, CancellationToken cancellationToken)
        {
            var locationIds = new List<Guid>();
            if (request.LocationId.HasValue)
            {
                locationIds.Add(request.LocationId.Value);
            }
            else
            {
                locationIds = _userInfoToken.LocationIds;
            }

            var profitLoss = await _purchaseOrderRepository.All
                .Where(c => !c.IsPurchaseOrderRequest
                    && locationIds.Contains(c.LocationId)
                    && c.POCreatedDate >= request.FromDate
                    && c.POCreatedDate < request.ToDate.AddDays(1))
                .GroupBy(c => 1)
                .Select(cs => new ProfitLossDto
                {
                    Total = cs.Sum(purchase => purchase.TotalAmount),
                    TotalTax = cs.Sum(purchase => purchase.TotalTax),
                    TotalDiscount = cs.Sum(purchase => purchase.TotalDiscount),
                    PaidPayment = cs.Sum(purchase => purchase.TotalPaidAmount),
                    TotalItem = cs.Count()
                }).FirstOrDefaultAsync();

            if (profitLoss == null)
            {
                return new ProfitLossDto();
            }

            return profitLoss;
        }
    }
}
