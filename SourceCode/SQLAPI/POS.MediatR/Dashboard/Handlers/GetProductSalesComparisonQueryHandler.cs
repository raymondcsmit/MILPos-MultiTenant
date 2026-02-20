using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.Data.Dto.Dashboard;
using POS.Data.Entities;
using POS.MediatR.Dashboard.Commands;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Dashboard.Handlers
{
    public class GetProductSalesComparisonQueryHandler : IRequestHandler<GetProductSalesComparisonQuery, List<ProductSalesComparisonDto>>
    {
        private readonly ISalesOrderItemRepository _salesOrderItemRepository;
        private readonly UserInfoToken _userInfoToken;

        public GetProductSalesComparisonQueryHandler(ISalesOrderItemRepository salesOrderItemRepository, UserInfoToken userInfoToken)
        {
            _salesOrderItemRepository = salesOrderItemRepository;
            _userInfoToken = userInfoToken;
        }

        public async Task<List<ProductSalesComparisonDto>> Handle(GetProductSalesComparisonQuery request, CancellationToken cancellationToken)
        {
            var locationIds = request.LocationId.HasValue 
                ? new List<Guid> { request.LocationId.Value } 
                : _userInfoToken.LocationIds;

            var currentYear = DateTime.Now.Year;
            var lastYear = currentYear - 1;

            // 1. Get Top Products for Current Year
            var currentYearSales = await _salesOrderItemRepository.AllIncluding(c => c.SalesOrder, cs => cs.Product)
                .Where(c => c.SalesOrder.SOCreatedDate.Year == currentYear
                        && locationIds.Contains(c.SalesOrder.LocationId)
                        && c.Status != PurchaseSaleItemStatusEnum.Return) // Exclude returns for simplicity or handle them? Requirement said "Sales"
                .GroupBy(c => new { c.ProductId, c.Product.Name })
                .Select(g => new
                {
                    ProductId = g.Key.ProductId,
                    ProductName = g.Key.Name,
                    Quantity = g.Sum(c => c.Quantity),
                    Revenue = g.Sum(c => (c.Quantity * c.UnitPrice) - c.Discount + c.TaxValue)
                })
                .OrderByDescending(x => x.Quantity)
                .Take(request.Count)
                .ToListAsync(cancellationToken);

            var topProductIds = currentYearSales.Select(x => x.ProductId).ToList();

            // 2. Get Statistics for these products for Last Year
            var lastYearSales = await _salesOrderItemRepository.AllIncluding(c => c.SalesOrder)
                .Where(c => c.SalesOrder.SOCreatedDate.Year == lastYear
                        && locationIds.Contains(c.SalesOrder.LocationId)
                        && topProductIds.Contains(c.ProductId)
                        && c.Status != PurchaseSaleItemStatusEnum.Return)
                .GroupBy(c => c.ProductId)
                .Select(g => new
                {
                    ProductId = g.Key,
                    Quantity = g.Sum(c => c.Quantity),
                    Revenue = g.Sum(c => (c.Quantity * c.UnitPrice) - c.Discount + c.TaxValue)
                })
                .ToListAsync(cancellationToken);

            // 3. Combine results
            var result = currentYearSales.Select(curr =>
            {
                var prev = lastYearSales.FirstOrDefault(x => x.ProductId == curr.ProductId);
                return new ProductSalesComparisonDto
                {
                    ProductName = curr.ProductName,
                    CurrentYearQuantity = (int) curr.Quantity,
                    LastYearQuantity = (int?) prev?.Quantity ?? 0,
                    CurrentYearRevenue = curr.Revenue,
                    LastYearRevenue = prev?.Revenue ?? 0m
                };
            }).ToList();

            return result;
        }
    }
}
