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
    public class GetLedgerAccountBalancesCommand : IRequest<ServiceResponse<List<LedgerAccountBalancesDto>>>
    {
        public Guid FinancialYearId { get; set; }
        public Guid? BranchId { get; set; }
    }
}
