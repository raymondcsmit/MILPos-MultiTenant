using POS.Data.Dto;
using MediatR;
using System;

namespace POS.MediatR.CommandAndQuery
{
    public class DashboardStaticaticsQuery : IRequest<DashboardStatics>
    {
        public DateTime FromDate  { get; set; }
        public DateTime ToDate { get; set; }
        public Guid? LocationId { get; set; }
    }
}
