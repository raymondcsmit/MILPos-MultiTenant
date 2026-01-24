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
    public class PaymentEntryDto
    {
        public Guid Id { get; set; }
        public Guid TransactionId { get; set; }
        public string TransactionNumber {  get; set; }
        public Guid BranchId { get; set; }
        public string BranchName { get; set; }
        public ACCPaymentMethod PaymentMethod { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; }
        public string ReferenceNumber { get; set; } 
        public string Narration { get; set; } 
        public ACCPaymentStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
