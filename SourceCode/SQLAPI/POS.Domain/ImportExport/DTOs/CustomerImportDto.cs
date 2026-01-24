using System;

namespace POS.Domain.ImportExport.DTOs
{
    public class CustomerImportDto
    {
        public string CustomerName { get; set; }
        public string ContactPerson { get; set; }
        public string Email { get; set; }
        public string MobileNo { get; set; }
        public string PhoneNo { get; set; }
        public string Fax { get; set; }
        public string Website { get; set; }
        public string TaxNumber { get; set; }
        public string Description { get; set; }
        
        // Billing Address
        public string BillingAddress { get; set; }
        public string BillingCity { get; set; }
        public string BillingCountry { get; set; }
        
        // Shipping Address
        public string ShippingAddress { get; set; }
        public string ShippingCity { get; set; }
        public string ShippingCountry { get; set; }
    }
}
