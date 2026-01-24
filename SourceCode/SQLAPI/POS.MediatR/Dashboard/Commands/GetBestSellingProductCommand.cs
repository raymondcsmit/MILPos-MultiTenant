using MediatR;
using POS.Data.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR.Dashboard.Commands
{
    public class GetBestSellingProductCommand : IRequest<List<BestSellingProductStatisticDto>>
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public Guid? LocationId { get; set; }
    }
}
