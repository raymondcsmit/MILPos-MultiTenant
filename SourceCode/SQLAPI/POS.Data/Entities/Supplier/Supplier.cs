using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data
{
    public class Supplier : BaseEntity
    {
        public Guid Id { get; set; }
        public string SupplierName { get; set; }
        public string ContactPerson { get; set; }
        public string Email { get; set; }
        public string Fax { get; set; }
        public string MobileNo { get; set; }
        public string PhoneNo { get; set; }
        public string Website { get; set; }
        public string Description { get; set; }
        public string Url { get; set; }
        public Guid BillingAddressId { get; set; }
        [ForeignKey("BillingAddressId")]
        public SupplierAddress BillingAddress { get; set; }
        public Guid ShippingAddressId { get; set; }
        [ForeignKey("ShippingAddressId")]
        public SupplierAddress ShippingAddress { get; set; }
        public string TaxNumber { get; set; }
      
    }
}
