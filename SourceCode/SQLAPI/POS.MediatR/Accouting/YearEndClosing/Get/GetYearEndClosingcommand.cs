using MediatR;
using POS.Data.Dto.Acconting.YearEndClosing;
using POS.Helper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.YearEndClosing.Get
{
    public class GetYearEndClosingcommand : IRequest<ServiceResponse<List<YearEndClosingResultDto>>>
    {
        public Guid FinancialYearId { get; set; }
        public Guid? BranchId { get; set; }
    }
}
