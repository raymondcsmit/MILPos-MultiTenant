using MediatR;
using POS.Data.Dto.Acconting.YearEndClosing;
using POS.Helper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.YearEndClosing
{
    public class AddYearEndClosingCommand:IRequest<ServiceResponse<List<YearEndClosingResultDto>>>
    {
        
    }
}
