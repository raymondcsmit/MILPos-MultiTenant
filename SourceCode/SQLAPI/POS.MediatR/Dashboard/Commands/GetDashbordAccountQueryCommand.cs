using MediatR;
using POS.Data.Dto;
using POS.Helper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR.Dashboard.Commands
{
    public class GetDashbordAccountQueryCommand : IRequest<DashboardStatics>
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public Guid? LocationId { get; set; }
    }
}
