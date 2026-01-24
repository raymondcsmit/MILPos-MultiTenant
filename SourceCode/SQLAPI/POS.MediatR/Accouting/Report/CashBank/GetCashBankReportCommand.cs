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
    public class GetCashBankReportCommand:IRequest<ServiceResponse<CashBankReReportDto>>
    {
        public Guid? BranchId { get; set; }
        public Guid FinancialYearId { get; set; }
    }
}
