using MediatR;
using POS.Data.Dto.Dashboard;
using POS.MediatR.PipeLineBehavior;
using System;
using System.Collections.Generic;

namespace POS.MediatR.Dashboard.Commands
{
    public class GetProductSalesComparisonQuery : IRequest<List<ProductSalesComparisonDto>>, ICacheableQuery
    {
        public Guid? LocationId { get; set; }
        public int Count { get; set; } = 10;

        public string CacheKey => $"GetProductSalesComparisonQuery_{LocationId}_{Count}";
        public TimeSpan? AbsoluteExpiration => TimeSpan.FromMinutes(15);
        public bool BypassCache => false;
    }
}
