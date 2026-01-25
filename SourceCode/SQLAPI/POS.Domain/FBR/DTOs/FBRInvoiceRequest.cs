using System;
using System.Collections.Generic;

namespace POS.Domain.FBR.DTOs
{
    /// <summary>
    /// Request DTO for submitting invoice to FBR API
    /// </summary>
    public class FBRInvoiceRequest
    {
        public string InvoiceNumber { get; set; }
        public string InvoiceType { get; set; } // "Sale", "Return", "CreditNote", "DebitNote"
        public DateTime InvoiceDate { get; set; }
        public string POSID { get; set; }
        public string BranchCode { get; set; }
        public string BuyerNTN { get; set; }
        public string BuyerCNIC { get; set; }
        public string BuyerName { get; set; }
        public string BuyerPhoneNumber { get; set; }
        public decimal TotalSaleValue { get; set; }
        public decimal TotalTaxCharged { get; set; }
        public int TotalQuantity { get; set; }
        public string PaymentMode { get; set; } // "Cash", "Card", "Credit"
        public string RefUSIN { get; set; } // For returns/credit notes - reference to original invoice
        public List<FBRInvoiceItem> Items { get; set; }
    }

    /// <summary>
    /// Individual item in FBR invoice
    /// </summary>
    public class FBRInvoiceItem
    {
        public string ItemCode { get; set; }
        public string ItemName { get; set; }
        public int Quantity { get; set; }
        public string PCTCode { get; set; } // Pakistan Customs Tariff code
        public decimal TaxRate { get; set; }
        public decimal SaleValue { get; set; }
        public decimal TaxCharged { get; set; }
        public decimal Discount { get; set; }
        public decimal FurtherTax { get; set; }
        public decimal TotalAmount { get; set; }
    }
}
