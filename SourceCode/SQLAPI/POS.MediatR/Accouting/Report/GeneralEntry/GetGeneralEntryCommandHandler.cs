using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto.Acconting.Report;
using POS.Helper;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.Report
{
    public class GetGeneralEntryCommandHandler(
        IAccountingEntryRepository _accountingEntryRepository) : IRequestHandler<GetGeneralEntryCommand, AccountingEntryList>
    {
        public async Task<AccountingEntryList> Handle(GetGeneralEntryCommand request, CancellationToken cancellationToken)
        {
            return await _accountingEntryRepository.GetAccountingEntryList(request.generalEntryResource);
           
        }
    }
}
