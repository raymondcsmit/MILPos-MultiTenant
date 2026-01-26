using CsvHelper.Configuration.Attributes;
using System;

namespace POS.Domain.ImportExport.DTOs
{
    public class CustomerImportDto
    {
        [Name("Customer Name")]
        public string CustomerName { get; set; }
        [Name("Contact Person")]
        public string ContactPerson { get; set; }
        [Name("Email")]
        public string Email { get; set; }
        [Name("Mobile No")]
        public string MobileNo { get; set; }
        [Name("Phone No")]
        public string PhoneNo { get; set; }
        [Name("Fax")]
        public string Fax { get; set; }
        [Name("Website")]
        public string Website { get; set; }
        [Name("Tax Number")]
        public string TaxNumber { get; set; }
        [Name("Description")]
        public string Description { get; set; }
        
        // Billing Address
        [Name("Billing Address")]
        public string BillingAddress { get; set; }
        [Name("Billing City")]
        public string BillingCity { get; set; }
        [Name("Billing Country")]
        public string BillingCountry { get; set; }
        
        // Shipping Address
        [Name("Shipping Address")]
        public string ShippingAddress { get; set; }
        [Name("Shipping City")]
        public string ShippingCity { get; set; }
        [Name("Shipping Country")]
        public string ShippingCountry { get; set; }
    }
}
