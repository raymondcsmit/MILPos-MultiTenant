using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto.Acconting;
using POS.Helper;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting
{
    public class GetLedgerAccountDropDownCommandHandler(
        ILedgerAccountRepository ledgerAccountRepository,
        IMapper _mapper) : IRequestHandler<GetLedgerAccountDropDownCommand, ServiceResponse<List<LedgerAccountDto>>>
    {
        public async Task<ServiceResponse<List<LedgerAccountDto>>> Handle(GetLedgerAccountDropDownCommand request, CancellationToken cancellationToken)
        {
            var accounts = await ledgerAccountRepository.All.ToListAsync();
            return ServiceResponse<List<LedgerAccountDto>>.ReturnResultWith200(_mapper.Map<List<LedgerAccountDto>>(accounts));
        }
    }
}
