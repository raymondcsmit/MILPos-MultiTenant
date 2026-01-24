using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Domain;
using POS.MediatR.Accouting.Strategies;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.Services;
public class PaymentService(
    IUnitOfWork<POSDbContext> _unitOfWork,
   IPaymentStrategyFactory _paymentStrategyFactory,
   IAccountingEntryFactory _entryFactory,
   ILogger<PaymentService> _logger,
   ITransactionRepository transactionRepository,
   IPaymentEntryRepository paymentEntryRepository,
   ILedgerAccountRepository ledgerAccountRepository,
   IAccountingEntryRepository accountingEntryRepository,
   IFinancialYearRepository financialYearRepository
   ) : IPaymentService
{
    public async Task<PaymentResponseDto> ProcessPaymentAsync(PaymentDto paymentDto)
    {
        _logger.LogInformation("Processing payment for transaction {TransactionId}, Amount: {Amount}",
            paymentDto.TransactionId, paymentDto.Amount);
        if (string.IsNullOrEmpty(paymentDto.OrderNumber))
        {
            throw new InvalidOperationException("Order Number is not found.");
        }
        try
        {
            var financialYearId = await financialYearRepository.All.Where(c => !c.IsClosed).Select(c => c.Id).FirstOrDefaultAsync();
            // Get transaction with details
            //var narrative = paymentDto.TransactionType.ToString().ToUpper();

            var narrative = paymentDto.TransactionType switch
            {
                TransactionType.Sale => "Sale Payment",
                TransactionType.SaleReturn => "Sale Refund Payment",
                TransactionType.Purchase => "Purchase Payment",
                TransactionType.PurchaseReturn => "Purchase Refund Payment",
                TransactionType.StockAdjustment => $"Stock Adjustment {paymentDto.Notes} Payment",
                _ => "Payment"
            };

            var paymenttransaction = new Transaction
            {
                Id = paymentDto.TransactionId,
                BranchId = paymentDto.BranchId,
                Narration = narrative,
                ReferenceNumber = paymentDto.OrderNumber,
                TransactionDate = DateTime.UtcNow,
                TransactionType = TransactionType.Payment,
                TotalAmount = paymentDto.Amount,
                FinancialYearId = financialYearId,
                TransactionNumber = await transactionRepository.GenerateTransactionNumberAsync(
                                  TransactionType.Payment),
            };
            transactionRepository.Add(paymenttransaction);
            // Get appropriate payment strategy
            var strategy = _paymentStrategyFactory.GetStrategy(paymentDto, paymenttransaction);

            // Validate payment
            var validationResult = strategy.ValidatePaymentAsync(paymenttransaction, paymentDto);
            if (!validationResult.IsValid)
            {
                throw new InvalidOperationException(validationResult.ErrorMessage);
            }

            // Process payment using strategy
            var paymentEntry = await strategy.ProcessPaymentAsync(paymenttransaction, paymentDto);


            if (await _unitOfWork.SaveAsync() <= -1)
            {
                _logger.LogError("Failed to save email SMTP settings.");
                throw new InvalidOperationException(validationResult.ErrorMessage);
            }

            var response = new PaymentResponseDto
            {
                PaymentEntryId = paymentEntry.Id,
                TransactionId = paymenttransaction.Id,
                TransactionNumber = paymenttransaction.TransactionNumber,
                BranchId = paymenttransaction.BranchId,
                PaymentMethod = paymentEntry.PaymentMethod,
                Amount = paymentEntry.Amount,
                PaymentDate = paymentEntry.PaymentDate,
                ReferenceNumber = paymentEntry.ReferenceNumber,
                Narration = paymentEntry.Narration,
                Status = paymentEntry.Status,
                RemainingBalance = paymenttransaction.BalanceAmount,
                TransactionPaymentStatus = paymenttransaction.PaymentStatus,
                AccountingEntries = paymenttransaction.AccountingEntries
                    .Where(ae => ae.Narration.Contains(paymentEntry.ReferenceNumber) ||
                                ae.Narration.Contains("payment", StringComparison.OrdinalIgnoreCase))
                    .Select(ae => new AccountingEntryDto
                    {
                        DebitAccount = ae.DebitLedgerAccount != null ? ae.DebitLedgerAccount.AccountName : "",
                        CreditAccount = ae.CreditLedgerAccount != null ? ae.CreditLedgerAccount.AccountName : "",
                        Amount = ae.Amount,
                        Narration = ae.Narration,
                        EntryType = ae.EntryType
                    }).ToList()
            };

            _logger.LogInformation("Payment processed successfully. Payment ID: {PaymentId}, Remaining Balance: {Balance}",
                paymentEntry.Id, paymenttransaction.BalanceAmount);

            return response;
        }
        catch
        {
            throw;
        }
    }

    public async Task<PaymentResponseDto> GetPaymentDetailsAsync(Guid paymentEntryId)
    {
        var paymentEntry = paymentEntryRepository.Find(paymentEntryId);
        if (paymentEntry == null)
        {
            throw new InvalidOperationException("Payment entry not found");
        }

        var transaction = transactionRepository.Find(paymentEntry.TransactionId);
        if (transaction == null)
        {
            throw new InvalidOperationException("Transaction not found");
        }

        return new PaymentResponseDto
        {
            PaymentEntryId = paymentEntry.Id,
            TransactionId = transaction.Id,
            TransactionNumber = transaction.TransactionNumber,
            BranchId = transaction.BranchId,
            PaymentMethod = paymentEntry.PaymentMethod,
            Amount = paymentEntry.Amount,
            PaymentDate = paymentEntry.PaymentDate,
            ReferenceNumber = paymentEntry.ReferenceNumber,
            Narration = paymentEntry.Narration,
            Status = paymentEntry.Status,
            RemainingBalance = transaction.BalanceAmount,
            TransactionPaymentStatus = transaction.PaymentStatus
        };
    }

    public async Task<PaymentResponseDto> RefundPaymentAsync(Guid paymentEntryId, decimal refundAmount, string reason)
    {
        _logger.LogInformation("Processing refund for payment {PaymentEntryId}, Amount: {Amount}", paymentEntryId, refundAmount);

        try
        {
            var originalPayment = paymentEntryRepository.Find(paymentEntryId);
            if (originalPayment == null)
            {
                throw new InvalidOperationException("Payment entry not found");
            }

            if (refundAmount > originalPayment.Amount)
            {
                throw new InvalidOperationException("Refund amount cannot exceed original payment amount");
            }

            var transaction = transactionRepository.Find(originalPayment.TransactionId);
            if (transaction == null)
            {
                throw new InvalidOperationException("Transaction not found");
            }

            // Create refund payment entry
            var refundPayment = new PaymentEntry
            {
                TransactionId = transaction.Id,
                BranchId = transaction.BranchId,
                PaymentMethod = originalPayment.PaymentMethod,
                Amount = -refundAmount, // Negative amount for refund
                PaymentDate = DateTime.UtcNow,
                ReferenceNumber = $"REF-{originalPayment.ReferenceNumber}",
                Narration = $"Refund for payment {originalPayment.Id} - {reason}",
                Status = ACCPaymentStatus.Completed
            };

            transaction.PaymentEntries.Add(refundPayment);

            // Update transaction totals
            transaction.PaidAmount -= refundAmount;
            transaction.BalanceAmount = transaction.TotalAmount - transaction.PaidAmount;
            transaction.PaymentStatus = transaction.BalanceAmount > 0.01m ? ACCPaymentStatus.Partial : ACCPaymentStatus.Completed;

            // Create reverse accounting entries
            //  await CreateRefundAccountingEntriesAsync(transaction, refundPayment, originalPayment);


            if (await _unitOfWork.SaveAsync() <= -1)
            {
                _logger.LogError("Failed to save email SMTP settings.");
            }

            var response = new PaymentResponseDto
            {
                PaymentEntryId = refundPayment.Id,
                TransactionId = transaction.Id,
                TransactionNumber = transaction.TransactionNumber,
                BranchId = transaction.BranchId,
                PaymentMethod = refundPayment.PaymentMethod,
                Amount = refundPayment.Amount,
                PaymentDate = refundPayment.PaymentDate,
                ReferenceNumber = refundPayment.ReferenceNumber,
                Narration = refundPayment.Narration,
                Status = refundPayment.Status,
                RemainingBalance = transaction.BalanceAmount,
                TransactionPaymentStatus = transaction.PaymentStatus
            };

            _logger.LogInformation("Refund processed successfully. Refund Payment ID: {PaymentId}", refundPayment.Id);

            return response;
        }
        catch (Exception ex)
        {
            throw ex;
        }
    }

    public async Task CreateRefundAccountingEntriesAsync(Transaction transaction)
    {
        // Get appropriate accounts based on payment method
        var cashAccount = await ledgerAccountRepository.GetByAccountCodeAsync("1050"); // Cash
        var bankAccount = await ledgerAccountRepository.GetByAccountCodeAsync("1060"); // Bank
        var debtorAccount = await ledgerAccountRepository.GetByAccountCodeAsync("1100"); // Accounts Receivable
        var creditorAccount = await ledgerAccountRepository.GetByAccountCodeAsync("2100"); // Accounts Payable

        //Guid paymentAccountId = transaction.PaymentEntries.Select(c => c.PaymentMethod) switch
        //{
        //    ACCPaymentMethod.Cash => cashAccount?.Id ?? Guid.Empty,
        //    ACCPaymentMethod.DebitCard or ACCPaymentMethod.CreditCard or ACCPaymentMethod.UPI or ACCPaymentMethod.NetBanking => bankAccount?.Id ?? Guid.Empty,
        //    _ => cashAccount?.Id ?? Guid.Empty
        //};
        var paymentMethod = transaction.PaymentEntries.Select(c => c.PaymentMethod).FirstOrDefault();

        Guid paymentAccountId = paymentMethod switch
        {
            ACCPaymentMethod.Cash => cashAccount?.Id ?? Guid.Empty,
            ACCPaymentMethod.DebitCard or
            ACCPaymentMethod.CreditCard or
            ACCPaymentMethod.UPI or
            ACCPaymentMethod.Cheque or
            ACCPaymentMethod.NetBanking => bankAccount?.Id ?? Guid.Empty,
            _ => cashAccount?.Id ?? Guid.Empty
        };

        if (paymentAccountId == Guid.Empty)
            throw new InvalidOperationException("Payment account not found");

        AccountingEntry refundAccountingEntry;

        if (transaction.TransactionType == TransactionType.Sale || transaction.TransactionType == TransactionType.SaleReturn)
        {
            // For Sales Refund: Dr. Accounts Receivable, Cr. Cash/Bank
            refundAccountingEntry = await _entryFactory.CreateEntryAsync(
                transaction.Id,
                transaction.BranchId,
                debtorAccount?.Id ?? Guid.Empty,
                paymentAccountId,
                transaction.TotalAmount,
                $"Payment refund - {transaction.ReferenceNumber} ",
                transaction.ReferenceNumber,
                 transaction.FinancialYearId,
                EntryType.Regular);
        }
        else
        {
            // For Purchase Refund: Dr. Cash/Bank, Cr. Accounts Payable
            refundAccountingEntry = await _entryFactory.CreateEntryAsync(
                transaction.Id,
                transaction.BranchId,
                paymentAccountId,
                creditorAccount?.Id ?? Guid.Empty,
                transaction.TotalAmount,
                $"Payment refund - {transaction.ReferenceNumber} ",
                transaction.ReferenceNumber,
                 transaction.FinancialYearId,
                EntryType.Regular);
        }

        accountingEntryRepository.Add(refundAccountingEntry);
        if (await _unitOfWork.SaveAsync() <= 0)
        {

        }
    }

    public async Task ProcessTransactionAsync(Transaction transaction)
    {
        transaction.TransactionNumber = await transactionRepository.GenerateTransactionNumberAsync(transaction.TransactionType);
        transactionRepository.Add(transaction);
        if (await _unitOfWork.SaveAsync() <= 0)
        {
            _logger.LogError("error while saving Expense Transaction");
        }
    }
}
