using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.MediatR.Dashboard.Commands;
using POS.Repository;

namespace POS.MediatR.Dashboard.Handlers
{
    public class GetBestSellingProductCommandHandler
        : IRequestHandler<GetBestSellingProductCommand, List<BestSellingProductStatisticDto>>
    {
        private readonly ISalesOrderItemRepository _salesOrderItemRepository;
        private readonly UserInfoToken _userInfoToken;

        public GetBestSellingProductCommandHandler(ISalesOrderItemRepository salesOrderItemRepository,
            UserInfoToken userInfoToken)
        {
            _salesOrderItemRepository = salesOrderItemRepository;
            _userInfoToken = userInfoToken;
        }

        public async Task<List<BestSellingProductStatisticDto>> Handle(GetBestSellingProductCommand request, CancellationToken cancellationToken)
        {
            var locationIds = new List<Guid>();
            if (request.LocationId.HasValue)
            {
                locationIds = [request.LocationId.Value];
            }
            else
            {
                locationIds = _userInfoToken.LocationIds;
            }

            var fromDate = request.FromDate;
            var toDate = request.ToDate.AddDays(1);

            var bestSellingProductStatistics = await _salesOrderItemRepository.AllIncluding(c => c.SalesOrder, cs => cs.Product)
                .Where(c => c.SalesOrder.SOCreatedDate >= fromDate
                        && c.SalesOrder.SOCreatedDate < toDate
                        && locationIds.Contains(c.SalesOrder.LocationId))
                .GroupBy(c => c.ProductId)
                .Select(cs => new BestSellingProductStatisticDto
                {
                    Name = cs.FirstOrDefault().Product.Name,
                    Count = cs.Sum(item => item.Status == PurchaseSaleItemStatusEnum.Return ? (-1) * item.Quantity : item.Quantity)
                })
                .Take(10)
                .ToListAsync();
            return bestSellingProductStatistics;
        }
    }
}
