using System;
using System.Collections.Generic;

namespace POS.Domain.FBR.DTOs
{
    /// <summary>
    /// Request DTO for submitting invoice to FBR API
    /// Based on FBR Fiscalization Component Specification
    /// </summary>
    public class FBRInvoiceRequest
    {
        public string InvoiceNumber { get; set; }
        public long POSID { get; set; } // bigint in FBR spec
        public string USIN { get; set; } // Compulsory
        public DateTime DateTime { get; set; } // Compulsory
        public string BuyerName { get; set; }
        public string BuyerNTN { get; set; }
        public string BuyerCNIC { get; set; }
        public string BuyerPhoneNumber { get; set; }
        public double TotalSaleValue { get; set; } // double in FBR spec
        public double TotalTaxCharged { get; set; }
        public double Discount { get; set; }
        public double FurtherTax { get; set; }
        public double TotalBillAmount { get; set; }
        public int PaymentMode { get; set; } // 1=Cash, 2=Card, etc.
        public int InvoiceType { get; set; } // 1=New, 3=Credit, etc.
        public string RefUSIN { get; set; }
        public List<FBRInvoiceItem> Items { get; set; }
    }

    /// <summary>
    /// Individual item in FBR invoice
    /// </summary>
    public class FBRInvoiceItem
    {
        public string ItemCode { get; set; }
        public string ItemName { get; set; }
        public string PCTCode { get; set; }
        public double Quantity { get; set; }
        public double TaxRate { get; set; }
        public double SaleValue { get; set; }
        public double Discount { get; set; }
        public double FurtherTax { get; set; }
        public double TaxCharged { get; set; }
        public double TotalAmount { get; set; }
        public int InvoiceType { get; set; } // 1=New, etc.
    }
}
