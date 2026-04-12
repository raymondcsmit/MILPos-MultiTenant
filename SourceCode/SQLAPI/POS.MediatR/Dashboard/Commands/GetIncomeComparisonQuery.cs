using MediatR;
using POS.Data.Dto.Dashboard;
using POS.MediatR.PipeLineBehavior;
using System;
using System.Collections.Generic;

namespace POS.MediatR.Dashboard.Commands
{
    public class GetIncomeComparisonQuery : IRequest<List<IncomeComparisonDto>>, ICacheableQuery
    {
        public Guid? LocationId { get; set; }

        public string CacheKey => $"GetIncomeComparisonQuery_{LocationId}";
        public TimeSpan? AbsoluteExpiration => TimeSpan.FromMinutes(15);
        public bool BypassCache => false;
    }
}
