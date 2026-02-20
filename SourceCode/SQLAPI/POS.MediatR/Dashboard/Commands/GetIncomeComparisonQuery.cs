using MediatR;
using POS.Data.Dto.Dashboard;
using System;
using System.Collections.Generic;

namespace POS.MediatR.Dashboard.Commands
{
    public class GetIncomeComparisonQuery : IRequest<List<IncomeComparisonDto>>
    {
        public Guid? LocationId { get; set; }
    }
}
