using POS.Data.Dto;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.Strategies;

public interface IPaymentStrategy
{
    Task<PaymentEntry> ProcessPaymentAsync(Transaction transaction, PaymentDto paymentDto);
    bool CanProcessPaymentAsync(Transaction transaction, PaymentDto paymentDto);
    PaymentValidationResult ValidatePaymentAsync(Transaction transaction, PaymentDto paymentDto);
}

public interface IFullPaymentStrategy : IPaymentStrategy { }
public interface IPartialPaymentStrategy : IPaymentStrategy { }


public class PaymentValidationResult
{
    public bool IsValid { get; set; }
    public string ErrorMessage { get; set; } = string.Empty;
    public System.Collections.Generic.List<string> Warnings { get; set; } = new();
}