using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Dto.Acconting
{
    public class TransactionDto
    {
        public Guid Id { get; set; }
        public string TransactionNumber { get; set; } 
        public TransactionType TransactionType { get; set; }
        public Guid BranchId { get; set; }
        public string BranchName { get; set; }
        public DateTime TransactionDate { get; set; }
        public decimal SubTotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal RoundOffAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public string Narration { get; set; } 
        public string ReferenceNumber { get; set; }
        public TransactionStatus Status { get; set; } 
        public ACCPaymentStatus PaymentStatus { get; set; } 
        public decimal PaidAmount { get; set; } 
        public decimal BalanceAmount { get; set; } 
        public virtual LocationDto Branch { get; set; } 
        public bool IsDeleted { get; set; }
        //public virtual ICollection<TransactionItemDto> TransactionItems { get; set; } = new List<TransactionItemDto>();
        //public virtual ICollection<AccountingEntryDto> AccountingEntries { get; set; } = new List<AccountingEntryDto>();
        //public virtual ICollection<TaxEntry> TaxEntries { get; set; } = new List<TaxEntry>();
        //public virtual ICollection<PaymentEntry> PaymentEntries { get; set; } = new List<PaymentEntry>();
    }
}
