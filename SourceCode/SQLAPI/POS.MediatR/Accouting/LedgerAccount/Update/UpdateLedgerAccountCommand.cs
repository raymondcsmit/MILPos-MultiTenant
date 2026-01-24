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
    public class UpdateLedgerAccountCommand:IRequest<ServiceResponse<LedgerAccountDto>>
    {
        public Guid Id { get; set; }
        public string AccountCode { get; set; }
        public string AccountName { get; set; }
    }
}
