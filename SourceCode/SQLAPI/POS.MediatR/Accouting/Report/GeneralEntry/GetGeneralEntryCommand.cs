using MediatR;
using POS.Data.Dto.Acconting.Report;
using POS.Data.Resources;
using POS.Helper;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.Report
{
    public class GetGeneralEntryCommand:IRequest<AccountingEntryList>
    {
       public GeneralEntryResource generalEntryResource { get; set; }
    }
}
