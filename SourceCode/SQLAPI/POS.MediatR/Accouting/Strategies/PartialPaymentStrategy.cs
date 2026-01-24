using POS.Data.Dto;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.Strategies;

public class PartialPaymentStrategy(
     IAccountingEntryFactory _accountingEntryFactory,
    IAccountingEntryRepository _accountingEntryRepository,
    ILedgerAccountRepository ledgerAccountRepository) : IPartialPaymentStrategy
{

    public bool CanProcessPaymentAsync(Transaction transaction, PaymentDto paymentDto)
    {
        return Math.Abs(paymentDto.Amount - transaction.BalanceAmount) < 0.01m;
    }

    public PaymentValidationResult ValidatePaymentAsync(Transaction transaction, PaymentDto paymentDto)
    {
        var result = new PaymentValidationResult { IsValid = true };

        if (paymentDto.Amount <= 0)
        {
            result.IsValid = false;
            result.ErrorMessage = "Payment amount must be greater than zero";
            return result;
        }

        if (paymentDto.Amount > transaction.BalanceAmount)
        {
            result.IsValid = false;
            result.ErrorMessage = $"Payment amount ({paymentDto.Amount:C}) cannot exceed balance amount ({transaction.BalanceAmount:C})";
            return result;
        }

        if (Math.Abs(paymentDto.Amount - transaction.BalanceAmount) > 0.01m)
        {
            result.Warnings.Add("Payment amount does not match full balance. Consider using partial payment strategy.");
        }

        return result;
    }

    public async Task<PaymentEntry> ProcessPaymentAsync(Transaction transaction, PaymentDto paymentDto)
    {
        // Create payment entry
        var paymentEntry = new PaymentEntry
        {
            TransactionId = transaction.Id,
            BranchId = transaction.BranchId,
            PaymentMethod = paymentDto.PaymentMethod,
            Amount = paymentDto.Amount,
            PaymentDate = paymentDto.PaymentDate,
            ReferenceNumber = paymentDto.OrderNumber,
            Narration = $"Partial payment for {transaction.TransactionNumber} - Payment {transaction.PaymentEntries.Count + 1}",
            Status = ACCPaymentStatus.Completed
        };

        transaction.PaymentEntries.Add(paymentEntry);

        // Update transaction payment status
        transaction.PaidAmount += paymentDto.Amount;
        transaction.BalanceAmount = transaction.TotalAmount - transaction.PaidAmount;

        if (transaction.BalanceAmount <= 0.01m)
        {
            transaction.PaymentStatus = ACCPaymentStatus.Completed;
        }
        else
        {
            transaction.PaymentStatus = ACCPaymentStatus.Partial;
        }

        // Create accounting entries
        await CreatePaymentAccountingEntriesAsync(transaction, paymentEntry);
        return paymentEntry;
    }

    private async Task CreatePaymentAccountingEntriesAsync(Transaction transaction, PaymentEntry paymentEntry)
    {
        // Get appropriate accounts based on payment method
        var cashAccount = await ledgerAccountRepository.GetByAccountCodeAsync("1050"); // Cash
        var bankAccount = await ledgerAccountRepository.GetByAccountCodeAsync("1060"); // Bank
        var debtorAccount = await ledgerAccountRepository.GetByAccountCodeAsync("1100"); // Accounts Receivable
        var creditorAccount = await ledgerAccountRepository.GetByAccountCodeAsync("2100"); // Accounts Payable

        Guid paymentAccountId = paymentEntry.PaymentMethod switch
        {
            ACCPaymentMethod.Cash => cashAccount?.Id ?? Guid.Empty,
            ACCPaymentMethod.DebitCard or ACCPaymentMethod.CreditCard or ACCPaymentMethod.UPI or ACCPaymentMethod.NetBanking or ACCPaymentMethod.Cheque => bankAccount?.Id ?? Guid.Empty,
            _ => cashAccount?.Id ?? Guid.Empty
        };

        if (paymentAccountId == Guid.Empty)
            throw new InvalidOperationException("Payment account not found");

        AccountingEntry paymentAccountingEntry;

        if (transaction.TransactionType == TransactionType.Sale || transaction.TransactionType == TransactionType.SaleReturn)
        {
            // For Sales: Dr. Cash/Bank, Cr. Accounts Receivable
            paymentAccountingEntry = await _accountingEntryFactory.CreateEntryAsync(
                transaction.Id,
                transaction.BranchId,
                paymentAccountId,
                debtorAccount?.Id ?? Guid.Empty,
                paymentEntry.Amount,
                $"Partial payment received - {paymentEntry.Narration}",
                paymentEntry.ReferenceNumber,
                 transaction.FinancialYearId,
                EntryType.Regular);
        }
        else
        {
            // For Purchases: Dr. Accounts Payable, Cr. Cash/Bank
            paymentAccountingEntry = await _accountingEntryFactory.CreateEntryAsync(
                transaction.Id,
                transaction.BranchId,
                creditorAccount?.Id ?? Guid.Empty,
                paymentAccountId,
                paymentEntry.Amount,
                $"Partial payment made - {paymentEntry.Narration}",
                paymentEntry.ReferenceNumber,
                 transaction.FinancialYearId,
                EntryType.Regular);
        }

        _accountingEntryRepository.Add(paymentAccountingEntry);
    }
}