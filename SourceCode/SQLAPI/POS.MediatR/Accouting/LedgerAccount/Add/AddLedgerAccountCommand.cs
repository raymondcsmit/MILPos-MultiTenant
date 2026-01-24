using MediatR;
using POS.Data.Dto.Acconting;
using POS.Data.Entities.Accounts;
using POS.Helper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR
{
    public class AddLedgerAccountCommand : IRequest<ServiceResponse<LedgerAccountDto>>
    {
        public string AccountCode { get; set; }
        public string AccountName { get; set; }
        public AccountType AccountType { get; set; }
        public AccountGroup AccountGroup { get; set; }
    }
}
