using MediatR;
using POS.Data.Dto.Dashboard;
using POS.MediatR.PipeLineBehavior;
using System;
using System.Collections.Generic;

namespace POS.MediatR.Dashboard.Commands
{
    public class GetSalesComparisonQuery : IRequest<List<SalesComparisonDto>>, ICacheableQuery
    {
        public Guid? LocationId { get; set; }

        public string CacheKey => $"GetSalesComparisonQuery_{LocationId}";
        public TimeSpan? AbsoluteExpiration => TimeSpan.FromMinutes(15);
        public bool BypassCache => false;
    }
}
