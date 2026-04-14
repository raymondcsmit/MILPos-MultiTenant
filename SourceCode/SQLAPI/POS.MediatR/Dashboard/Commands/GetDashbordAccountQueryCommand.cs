using MediatR;
using POS.Data.Dto;
using POS.Helper;
using POS.MediatR.PipeLineBehavior;
using System;

namespace POS.MediatR.Dashboard.Commands
{
    public class GetDashbordAccountQueryCommand : IRequest<DashboardStatics>, ICacheableQuery
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public Guid? LocationId { get; set; }

        public string CacheKey => $"GetDashbordAccountQueryCommand_{FromDate:yyyyMMdd}_{ToDate:yyyyMMdd}_{LocationId}";
        public TimeSpan? AbsoluteExpiration => TimeSpan.FromMinutes(15);
        public bool BypassCache => false;
    }
}
