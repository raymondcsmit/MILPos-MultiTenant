using Amazon.Runtime.Internal.Util;
using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Dto.Acconting;
using POS.Domain;
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
    public class UpdateLedgerAccountCommandHandler(
        ILedgerAccountRepository ledgerAccountRepository,
        IUnitOfWork<POSDbContext> _uow,
        ILogger<UpdateLedgerAccountCommandHandler> _logger,
        IMapper _mapper) : IRequestHandler<UpdateLedgerAccountCommand, ServiceResponse<LedgerAccountDto>>
    {
        public async Task<ServiceResponse<LedgerAccountDto>> Handle(UpdateLedgerAccountCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var account = await ledgerAccountRepository.All.Where(c => c.Id == request.Id && !c.IsSystem).FirstOrDefaultAsync();
                if (account == null)
                {
                    return ServiceResponse<LedgerAccountDto>.Return409("system ledger account Can't Update");
                }

                var existingAccount = await ledgerAccountRepository.All
                        .Where(c => c.Id != request.Id && (c.AccountCode == request.AccountCode
                        || c.AccountName.ToLower() == request.AccountName.ToLower())).FirstOrDefaultAsync();

                if (existingAccount != null)
                {
                    return ServiceResponse<LedgerAccountDto>.Return404("Account with same code or name already exists");
                }

                account.AccountCode = request.AccountCode;
                account.AccountName = request.AccountName;
                ledgerAccountRepository.Update(account);

                if (await _uow.SaveAsync() < 0)
                {
                    return ServiceResponse<LedgerAccountDto>.Return500("An unexpected fault happened");
                }

                return ServiceResponse<LedgerAccountDto>.ReturnResultWith200(_mapper.Map<LedgerAccountDto>(account));
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while updating ledger account");
                return ServiceResponse<LedgerAccountDto>.Return500("error while updating ledger account");
            }
        }
    }
}
