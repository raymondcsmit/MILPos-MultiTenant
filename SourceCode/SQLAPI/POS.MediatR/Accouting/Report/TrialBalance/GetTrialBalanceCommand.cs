using MediatR;
using POS.Data.Dto.Acconting.Report;
using POS.Helper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.Report
{
    public class GetTrialBalanceCommand:IRequest<ServiceResponse<TrialBalanceDto>>
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public Guid? LocationId { get; set; }
    }
}
