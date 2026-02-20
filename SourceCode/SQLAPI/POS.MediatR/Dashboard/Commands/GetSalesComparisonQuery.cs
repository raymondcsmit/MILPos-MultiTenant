using MediatR;
using POS.Data.Dto.Dashboard;
using System;
using System.Collections.Generic;

namespace POS.MediatR.Dashboard.Commands
{
    public class GetSalesComparisonQuery : IRequest<List<SalesComparisonDto>>
    {
        public Guid? LocationId { get; set; }
    }
}
