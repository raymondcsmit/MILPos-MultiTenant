using POS.Data.Dto;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.Strategies;

public class FullPaymentStrategy(
    IAccountingEntryFactory _accountingEntryFactory,
    IAccountingEntryRepository _accountingEntryRepository,
    ILedgerAccountRepository ledgerAccountRepository,
    IPaymentEntryRepository paymentEntryRepository) : IFullPaymentStrategy
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

        //if (paymentDto.Amount > transaction.BalanceAmount)
        //{
        //    result.IsValid = false;
        //    result.ErrorMessage = $"Payment amount ({paymentDto.Amount:C}) cannot exceed balance amount ({transaction.BalanceAmount:C})";
        //    return result;
        //}

        //if (Math.Abs(paymentDto.Amount - transaction.BalanceAmount) > 0.01m)
        //{
        //    result.Warnings.Add("Payment amount does not match full balance. Consider using partial payment strategy.");
        //}

        return result;
    }

    public async Task<PaymentEntry> ProcessPaymentAsync(Transaction transaction, PaymentDto paymentDto)
    {
        // Create payment entry
        var paymentEntry = new PaymentEntry
        {
            Id = Guid.NewGuid(),
            TransactionId = transaction.Id,
            BranchId = transaction.BranchId,
            PaymentMethod = paymentDto.PaymentMethod,
            Amount = paymentDto.Amount,
            PaymentDate = paymentDto.PaymentDate,
            ReferenceNumber = paymentDto.OrderNumber,
            Narration = $"Full payment for {transaction.Narration} - {transaction.TransactionNumber}",
            Status = ACCPaymentStatus.Completed
        };
        paymentEntryRepository.Add(paymentEntry);
        // Create accounting entries based on transaction type and payment method
        await CreatePaymentAccountingEntriesAsync(transaction, paymentEntry, paymentDto.TransactionType);
        return paymentEntry;
    }

    private async Task CreatePaymentAccountingEntriesAsync(Transaction transaction, PaymentEntry paymentEntry, TransactionType transactionType)
    {
        // Get appropriate accounts based on payment method
        var cashAccount = await ledgerAccountRepository.GetByAccountCodeAsync("1050"); // Cash
        var bankAccount = await ledgerAccountRepository.GetByAccountCodeAsync("1060"); // Bank
        var debtorAccount = await ledgerAccountRepository.GetByAccountCodeAsync("1100"); // Accounts Receivable
        var creditorAccount = await ledgerAccountRepository.GetByAccountCodeAsync("2100"); // Accounts Payable

        Guid paymentAccountId = paymentEntry.PaymentMethod switch
        {
            ACCPaymentMethod.Cash => cashAccount?.Id ?? Guid.Empty,
            ACCPaymentMethod.DebitCard or ACCPaymentMethod.CreditCard or ACCPaymentMethod.UPI or ACCPaymentMethod.NetBanking => bankAccount?.Id ?? Guid.Empty,
            _ => cashAccount?.Id ?? Guid.Empty
        };

        if (paymentAccountId == Guid.Empty)
            throw new InvalidOperationException("Payment account not found");

        AccountingEntry paymentAccountingEntry;

        if (transactionType == TransactionType.Sale || transactionType == TransactionType.SaleReturn)
        {
            var debutAccountId = transactionType == TransactionType.Sale ? paymentAccountId : debtorAccount?.Id ?? Guid.Empty;
            var creditAccountId = transactionType == TransactionType.Sale ? debtorAccount?.Id ?? Guid.Empty : paymentAccountId;
            // For Sales: Dr. Cash/Bank, Cr. Accounts Receivable
            paymentAccountingEntry = await _accountingEntryFactory.CreateEntryAsync(
                transaction.Id,
                transaction.BranchId,
                debutAccountId,
                creditAccountId,
                paymentEntry.Amount,
                $"Payment received - {paymentEntry.Narration}",
                paymentEntry.ReferenceNumber,
                 transaction.FinancialYearId,
                EntryType.Regular);

            _accountingEntryRepository.Add(paymentAccountingEntry);
        }
        else if (transactionType == TransactionType.Purchase || transactionType == TransactionType.PurchaseReturn)
        {
            var debutAccountId = transactionType == TransactionType.Purchase ? creditorAccount?.Id ?? Guid.Empty : paymentAccountId;
            var creditAccountId = transactionType == TransactionType.Purchase ? paymentAccountId : creditorAccount?.Id ?? Guid.Empty;

            // For Purchases: Dr. Accounts Payable, Cr. Cash/Bank
            paymentAccountingEntry = await _accountingEntryFactory.CreateEntryAsync(
                transaction.Id,
                transaction.BranchId,
                debutAccountId,
                creditAccountId,
                paymentEntry.Amount,
                $"Payment made - {paymentEntry.Narration}",
                paymentEntry.ReferenceNumber,
                 transaction.FinancialYearId,
                EntryType.Regular);

            _accountingEntryRepository.Add(paymentAccountingEntry);
        }
        else if (transactionType == TransactionType.StockAdjustment)
        {
            if (paymentEntry.Narration.Contains("Gain", StringComparison.OrdinalIgnoreCase)) // Gain
            {
                var debitAccountId = creditorAccount?.Id ?? Guid.Empty; // Account Payable
                var creditAccountId = paymentAccountId; // Payment Account

                paymentAccountingEntry = await _accountingEntryFactory.CreateEntryAsync(
                    transaction.Id,
                    transaction.BranchId,
                    debitAccountId,
                    creditAccountId,
                    paymentEntry.Amount,
                    $"Payment made - {paymentEntry.Narration}",
                    paymentEntry.ReferenceNumber,
                    transaction.FinancialYearId,
                    EntryType.Regular);
            }
            else // Loss
            {
                var debitAccountId = paymentAccountId; // Payment Account
                var creditAccountId = creditorAccount?.Id ?? Guid.Empty; // Account Payable

                paymentAccountingEntry = await _accountingEntryFactory.CreateEntryAsync(
                    transaction.Id,
                    transaction.BranchId,
                    debitAccountId,
                    creditAccountId,
                    Math.Abs(paymentEntry.Amount),
                    $"Payment made - {paymentEntry.Narration}",
                    paymentEntry.ReferenceNumber,
                    transaction.FinancialYearId,
                    EntryType.Regular);
            }
            _accountingEntryRepository.Add(paymentAccountingEntry);
        }
        
    }
}