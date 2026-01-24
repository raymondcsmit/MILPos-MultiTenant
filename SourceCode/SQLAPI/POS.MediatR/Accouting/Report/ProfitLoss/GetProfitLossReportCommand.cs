using MediatR;
using POS.Data.Dto.Acconting;
using POS.Helper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting
{
    public class GetProfitLossReportCommand:IRequest<ServiceResponse<ProfitLossDataDto>>
    {
        public Guid FinancialYearId { get; set; }
        public Guid? BranchId { get; set; }
    }
}
