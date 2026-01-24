using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.Strategies;

public interface ILoanStrategy
{
    Task ProcessLoanAsync(LoanDetail loanDetail, Transaction transaction);
    Task ProcessPaymentOfLoanAsync(LoanDetail loanDetail, Transaction transaction, LoanRepayment loanRepayment);
}

public class LoanStrategy(
     IAccountingEntryFactory _accountingEntryFactory,
    IAccountingEntryRepository _accountingEntryRepository,
    ILedgerAccountRepository _ledgerAccountRepository) : ILoanStrategy
{
    public async Task ProcessLoanAsync(LoanDetail loanDetail, Transaction transaction)
    {
        // Ledger accounts
        var bankAccount = await _ledgerAccountRepository.GetByAccountCodeAsync("1060"); // Bank

        if (bankAccount == null || bankAccount == null)
            throw new InvalidOperationException("Required bank ledger accounts not found");

        _accountingEntryRepository.Add(await _accountingEntryFactory.CreateEntryAsync(
            transaction.Id, loanDetail.BranchId, bankAccount.Id, loanDetail.LoanAccountId, loanDetail.LoanAmount, loanDetail.Narration, loanDetail.Id.ToString(), transaction.FinancialYearId, EntryType.Loan));
    }
    public async Task ProcessPaymentOfLoanAsync(LoanDetail loanDetail, Transaction transaction, LoanRepayment loanRepayment)
    {
        // Ledger accounts
        var bankAccount = await _ledgerAccountRepository.GetByAccountCodeAsync("1060"); // Bank

        if (bankAccount == null || bankAccount == null)
            throw new InvalidOperationException("Required bank ledger accounts not found");
        if (loanRepayment.PricipalAmount > 0)
        {
            _accountingEntryRepository.Add(await _accountingEntryFactory.CreateEntryAsync(
                transaction.Id, loanDetail.BranchId, loanDetail.LoanAccountId, bankAccount.Id, loanRepayment.PricipalAmount, loanDetail.Narration, loanDetail.Id.ToString(), transaction.FinancialYearId, EntryType.Loan));

        }
        if (loanRepayment.InterestAmount > 0)
        {
            _accountingEntryRepository.Add(await _accountingEntryFactory.CreateEntryAsync(
                transaction.Id, loanDetail.BranchId, loanDetail.LoanAccountInterestExpenseId, bankAccount.Id, loanDetail.LoanAmount, loanDetail.Narration, loanDetail.Id.ToString(), transaction.FinancialYearId, EntryType.Loan));

        }
    }
}
