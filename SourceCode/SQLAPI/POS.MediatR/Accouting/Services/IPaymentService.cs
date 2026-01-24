using POS.Data.Dto;
using POS.Data.Entities;
using System;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.Services;
public interface IPaymentService
{
    Task<PaymentResponseDto> ProcessPaymentAsync(PaymentDto paymentDto);
    Task<PaymentResponseDto> GetPaymentDetailsAsync(Guid paymentEntryId);

    Task<PaymentResponseDto> RefundPaymentAsync(Guid paymentEntryId, decimal refundAmount, string reason);
    Task ProcessTransactionAsync(Transaction transaction);
    Task CreateRefundAccountingEntriesAsync(Transaction transaction);
}
