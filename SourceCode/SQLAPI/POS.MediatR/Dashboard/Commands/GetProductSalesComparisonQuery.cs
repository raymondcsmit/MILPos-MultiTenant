using MediatR;
using POS.Data.Dto.Dashboard;
using System;
using System.Collections.Generic;

namespace POS.MediatR.Dashboard.Commands
{
    public class GetProductSalesComparisonQuery : IRequest<List<ProductSalesComparisonDto>>
    {
        public Guid? LocationId { get; set; }
        public int Count { get; set; } = 10;
    }
}
