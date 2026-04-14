using MediatR;
using POS.Data.Dto;
using POS.MediatR.PipeLineBehavior;
using System;
using System.Collections.Generic;

namespace POS.MediatR.Dashboard.Commands
{
    public class GetBestSellingProductCommand : IRequest<List<BestSellingProductStatisticDto>>, ICacheableQuery
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public Guid? LocationId { get; set; }

        public string CacheKey => $"GetBestSellingProductCommand_{FromDate:yyyyMMdd}_{ToDate:yyyyMMdd}_{LocationId}";
        public TimeSpan? AbsoluteExpiration => TimeSpan.FromMinutes(15);
        public bool BypassCache => false;
    }
}
