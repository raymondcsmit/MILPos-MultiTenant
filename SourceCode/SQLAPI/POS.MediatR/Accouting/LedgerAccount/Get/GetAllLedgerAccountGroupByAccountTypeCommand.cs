using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data.Dto.Acconting;
using POS.Data.Entities.Accounts;
using POS.Helper;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR;
public class GetAllLedgerAccountGroupByAccountTypeCommand : IRequest<ServiceResponse<List<AccountTypeGroupDto>>>
{
    public Guid BranchId { get; set; }
}
public class GetAllLedgerAccountGroupByAccountTypeCommandHandler(
    ILedgerAccountRepository ledgerAccountRepository,
    IAccountingEntryRepository _accountingEntryRepository,
    IFinancialYearRepository _financialYearRepository,
    ILogger<GetAllLedgerAccountGroupByAccountTypeCommandHandler> _logger) : IRequestHandler<GetAllLedgerAccountGroupByAccountTypeCommand, ServiceResponse<List<AccountTypeGroupDto>>>
{
    public async Task<ServiceResponse<List<AccountTypeGroupDto>>> Handle(GetAllLedgerAccountGroupByAccountTypeCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var accounts = await ledgerAccountRepository.All.ToListAsync(cancellationToken);
            var financialYearId = await _financialYearRepository.All.Where(c => !c.IsClosed).Select(c => c.Id).FirstOrDefaultAsync();

            var openingBalances = _accountingEntryRepository
                .AllIncluding(d => d.Transaction)
                    .Where(e => e.Transaction.TransactionType == TransactionType.OpeningBalance
                        && e.FinancialYearId == financialYearId && e.BranchId == request.BranchId)
                    .AsEnumerable()
                    .SelectMany(e => new List<GroupedAccountDto> {
                    new GroupedAccountDto {
                        AccountId = e.DebitLedgerAccountId,
                        Amount = e.Amount, Type = "Dr" ,
                    },
                    new GroupedAccountDto {
                        AccountId = e.CreditLedgerAccountId,
                        Amount = e.Amount, Type = "Cr",

                    }
                    }).ToList()
                    .GroupBy(x => new { x.AccountId })
                    .Select(g => new
                    {
                        AccountId = g.Key.AccountId,
                        DebitTotal = g.Where(x => x.Type == "Dr").Sum(x => x.Amount),
                        CreditTotal = g.Where(x => x.Type == "Cr").Sum(x => x.Amount)
                    }).ToList();

            var ledgerAccounts = new List<LedgerAccountDto>();
            foreach (var account in accounts)
            {
                if (account.AccountCode == "5555")
                    continue;
                var LedgerAccount = openingBalances.FirstOrDefault(c => c.AccountId == account.Id);

                decimal debit = LedgerAccount?.DebitTotal ?? 0;
                decimal credit = LedgerAccount?.CreditTotal ?? 0;
                ledgerAccounts.Add(new LedgerAccountDto
                {
                    Id = account.Id,
                    AccountCode = account.AccountCode,
                    AccountGroup = account.AccountGroup,
                    AccountName = account.AccountName,
                    AccountType = account.AccountType,
                    OpeningBalance = credit - debit,
                    IsActive = account.IsActive,
                    IsSystem = account.IsSystem,
                    ParentAccountId = account.ParentAccountId
                });
            }
            var ledgerAccountsGroup = ledgerAccounts.GroupBy(x => x.AccountType)
                   .Select(g => new AccountTypeGroupDto
                   {
                       AccountType = g.Key,
                       Items = g.ToList()
                   }).ToList();

            return ServiceResponse<List<AccountTypeGroupDto>>.ReturnResultWith200(ledgerAccountsGroup);
        }
        catch (System.Exception ex)
        {
            _logger.LogError(ex, "error while getting Ledger Account");
            return ServiceResponse<List<AccountTypeGroupDto>>.Return500("error while getting Ledger Account");
        }
    }
}
