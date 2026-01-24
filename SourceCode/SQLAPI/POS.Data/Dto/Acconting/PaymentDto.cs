using POS.Data.Entities.Accounts;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace POS.Data.Dto;
public class PaymentDto
{
    public Guid TransactionId { get; set; }

    [Required]
    public Guid BranchId { get; set; }

    [Required]
    [Range(0, double.MaxValue, ErrorMessage = "Payment amount must be non-negative")]
    public decimal Amount { get; set; }

    public ACCPaymentMethod PaymentMethod { get; set; } = ACCPaymentMethod.Cash;

    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;

    [MaxLength(100)]
    public string ReferenceNumber { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Notes { get; set; } = string.Empty;

    // For partial payments
    public bool CreateScheduleForBalance { get; set; } = false;

    public string OrderNumber { get; set; }
    public TransactionType TransactionType { get; set; }
    public Guid FinancialYearId { get; set; } = Guid.Empty;


    // For installment payments

}

public class PaymentResponseDto
{
    public Guid PaymentEntryId { get; set; }
    public Guid TransactionId { get; set; }
    public string TransactionNumber { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
    public ACCPaymentMethod PaymentMethod { get; set; }
    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; }
    public string ReferenceNumber { get; set; } = string.Empty;
    public string Narration { get; set; } = string.Empty;
    public ACCPaymentStatus Status { get; set; }
    public decimal RemainingBalance { get; set; }
    public ACCPaymentStatus TransactionPaymentStatus { get; set; }
    public List<AccountingEntryDto> AccountingEntries { get; set; } = new();
}
