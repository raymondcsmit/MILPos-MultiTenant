using MediatR;
using POS.Data.Dto.Acconting;
using POS.Helper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.Report
{
    public class GetBalanceSheetReportCommand:IRequest<ServiceResponse<BalanceSheetDto>>
    {
        public Guid? BranchId { get; set; }
        public Guid FinancialYearId { get; set; }
    }
}
