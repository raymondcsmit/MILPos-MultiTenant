using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
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

namespace POS.MediatR.Accouting.GeneralEntry
{
    public class AddGeneralEntryCommandHandler(
        IAccountingEntryRepository _accountingEntryRepository,
        IFinancialYearRepository _financialYearRepository,
        IUnitOfWork<POSDbContext> _uow,
        ILogger<AddGeneralEntryCommandHandler> _logger,
        ITransactionRepository _transactionRepository,
        IAccountingEntryFactory _accountingEntryFactory) : IRequestHandler<AddGeneralEntryCommand, ServiceResponse<bool>>
    {
        public async Task<ServiceResponse<bool>> Handle(AddGeneralEntryCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var financialYearId = await _financialYearRepository.All.Where(c => !c.IsClosed).Select(c => c.Id).FirstOrDefaultAsync();
                //Save Transaction
                var referenceNumber = !string.IsNullOrWhiteSpace(request.ReferenceNumber)
                    ? request.ReferenceNumber : await _transactionRepository.GenerateTransactionNumberAsync(TransactionType.DirectEntry);
                var transaction = new Transaction
                {
                    FinancialYearId = financialYearId,
                    BranchId = request.BranchId,
                    SubTotal = request.Amount,
                    CreatedDate = DateTime.UtcNow,
                    Narration = request.Narration,
                    Status = TransactionStatus.Completed,
                    TotalAmount = request.Amount,
                    TransactionDate = request.TransitionDate.ToUniversalTime(),
                    TransactionType = TransactionType.DirectEntry,
                    TransactionNumber = referenceNumber
                };
                _transactionRepository.Add(transaction);

                var mainEntry = await _accountingEntryFactory.CreateEntryAsync(
                transaction.Id,
                transaction.BranchId,
                request.DebitLedgerAccountId,
                request.CreditLedgerAccountId,
                transaction.TotalAmount,
                transaction.Narration,
                transaction.ReferenceNumber,
                transaction.FinancialYearId,
                EntryType.Regular);

                _accountingEntryRepository.Add(mainEntry);
                if (await _uow.SaveAsync() <= 0)
                {
                    return ServiceResponse<bool>.Return500("An unexpected fault happened");
                }
                return ServiceResponse<bool>.ReturnResultWith200(true);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while saving general entry");
                return ServiceResponse<bool>.Return500("error while saving general entry");
            }

        }
    }
}
