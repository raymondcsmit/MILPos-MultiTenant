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
using POS.MediatR.SalesOrder.Commands;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.SalesOrder.Handlers
{
    public class GetSaleOrderProfitLossCommandHandler : IRequestHandler<GetSaleOrderProfitLossCommand, ProfitLossDto>
    {
        private readonly ISalesOrderRepository _salesOrderRepository;
        private readonly UserInfoToken _userInfoToken;

        public GetSaleOrderProfitLossCommandHandler(
            ISalesOrderRepository salesOrderRepository, UserInfoToken userInfoToken)
        {
            _salesOrderRepository = salesOrderRepository;
            _userInfoToken = userInfoToken;
        }

        public async Task<ProfitLossDto> Handle(GetSaleOrderProfitLossCommand request, CancellationToken cancellationToken)
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

            var salesOrders = await _salesOrderRepository.All
                .Where(c => !c.IsSalesOrderRequest
                    && locationIds.Contains(c.LocationId)
                    && c.CreatedDate >= request.FromDate
                    && c.CreatedDate < request.ToDate.AddDays(1))
                .GroupBy(c => 1)
                .Select(cs => new ProfitLossDto
                {
                    Total = cs.Sum(sales => sales.TotalAmount),
                    TotalTax = cs.Sum(sales => sales.TotalTax),
                    TotalDiscount = cs.Sum(sales => sales.TotalDiscount),
                    PaidPayment = cs.Sum(sales => sales.TotalPaidAmount),
                    TotalItem = cs.Count()
                }).FirstOrDefaultAsync();

            if (salesOrders == null)
            {
                return new ProfitLossDto();
            }

            return salesOrders;
        }
    }
}
