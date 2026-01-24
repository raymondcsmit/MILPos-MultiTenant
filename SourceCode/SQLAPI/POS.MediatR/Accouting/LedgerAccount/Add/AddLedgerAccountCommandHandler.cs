using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Dto.Acconting;
using POS.Data.Entities.Accounts;
using POS.Domain;
using POS.Helper;
using POS.Repository.Accouting;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR
{
    public class AddLedgerAccountCommandHandler(
        ILedgerAccountRepository ledgerAccountRepository,
        IUnitOfWork<POSDbContext> uow,
        ILogger<AddLedgerAccountCommandHandler> logger,
        IMapper mapper
        )
        : IRequestHandler<AddLedgerAccountCommand, ServiceResponse<LedgerAccountDto>>
    {
        public async Task<ServiceResponse<LedgerAccountDto>> Handle(AddLedgerAccountCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var existingAccount = await ledgerAccountRepository.All
                    .Where(c => c.AccountCode == request.AccountCode
                    || c.AccountName.ToLower() == request.AccountName.ToLower())
                    .FirstOrDefaultAsync();

                if (existingAccount != null)
                {
                    logger.LogError("Account with same code or name already exists");
                    return ServiceResponse<LedgerAccountDto>.Return409("Account with same code or name already exists");
                }
                var newAccount = mapper.Map<LedgerAccount>(request);
                newAccount.Id = Guid.NewGuid();
                newAccount.IsActive = true;
                newAccount.IsSystem = false;
                ledgerAccountRepository.Add(newAccount);

                if (await uow.SaveAsync() < 0)
                {
                    return ServiceResponse<LedgerAccountDto>.Return500("An unexpected fault happened");
                }
                return ServiceResponse<LedgerAccountDto>.ReturnResultWith200(mapper.Map<LedgerAccountDto>(newAccount));
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error adding ledger account");
                return ServiceResponse<LedgerAccountDto>.Return500("An unexpected fault happened");
            }
        }
    }
}
