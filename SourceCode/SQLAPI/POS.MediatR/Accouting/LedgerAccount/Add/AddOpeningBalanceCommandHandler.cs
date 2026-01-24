using Amazon.Runtime.Internal.Util;
using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Dto.Acconting;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Domain;
using POS.Helper;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting
{
    public class AddOpeningBalanceCommandHandler(
        ILedgerAccountRepository _ledgerAccountRepository,
        IAccountingEntryRepository _accountingEntryRepository,
        IAccountingEntryFactory _entryFactory,
        ITransactionRepository _transactionRepository,
        IUnitOfWork<POSDbContext> _uow,
         ILogger<AddOpeningBalanceCommandHandler> _logger) : IRequestHandler<AddOpeningBalanceCommand, ServiceResponse<bool>>
    {
        public async Task<ServiceResponse<bool>> Handle(AddOpeningBalanceCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var openingBalanceAdjustment = await _ledgerAccountRepository.GetByAccountCodeAsync("5555");
                var account = await _ledgerAccountRepository.All.Where(c => c.Id == request.AccountId).FirstOrDefaultAsync();
                if (account == null)
                {
                    return ServiceResponse<bool>.Return404("account not found");
                }
                var transaction = new Transaction
                {
                    BranchId = request.LocationId,
                    Narration = $"Opening Balance Account {account.AccountName} {(request.Type == OpeningBalanceType.Debit ? "Debit" : "Credit")}",
                    ReferenceNumber = "",
                    TransactionDate = DateTime.UtcNow,
                    TransactionType = TransactionType.OpeningBalance,
                    TotalAmount = request.OpeningBalance,
                    FinancialYearId = request.FinancialYearId,
                    TransactionNumber = await _transactionRepository.GenerateTransactionNumberAsync(
                                     TransactionType.OpeningBalance),
                };
                _transactionRepository.Add(transaction);

                var mainEntry = await _entryFactory.CreateEntryAsync(
                transaction.Id,
                transaction.BranchId,
                request.Type == OpeningBalanceType.Debit ? account.Id : openingBalanceAdjustment.Id,
                request.Type == OpeningBalanceType.Credit ? account.Id : openingBalanceAdjustment.Id,
                transaction.TotalAmount,
                transaction.Narration,
                transaction.ReferenceNumber,
                transaction.FinancialYearId,
                EntryType.OpeningBalance);

                 _accountingEntryRepository.Add(mainEntry);

                if (await _uow.SaveAsync() <= 0)
                {
                    return ServiceResponse<bool>.Return500("An unexpected fault happened");
                }
                return ServiceResponse<bool>.ReturnResultWith200(true);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while saving Opning balance");
                return ServiceResponse<bool>.Return500("error while saving Opning balance");
            }

        }
    }
}
