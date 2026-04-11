using POS.Data.Entities;
using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data
{
    public class Customer : BaseEntity
    {
        public Guid Id { get; set; }
        public string CustomerName { get; set; }
        public string ContactPerson { get; set; }
        public string Email { get; set; }
        public string Fax { get; set; }
        public string MobileNo { get; set; }
        public string PhoneNo { get; set; }
        public string Website { get; set; }
        public string Description { get; set; }
        public string Url { get; set; }
        public Guid? BillingAddressId { get; set; }
        [ForeignKey("BillingAddressId")]
        public ContactAddress BillingAddress { get; set; }
        public Guid? ShippingAddressId { get; set; }
        [ForeignKey("ShippingAddressId")]
        public ContactAddress ShippingAddress { get; set; }
        public bool IsWalkIn { get; set; }
        public string TaxNumber { get; set; }
        
        // Sales Person & Region attribution
        public Guid? SalesPersonId { get; set; }
        [ForeignKey("SalesPersonId")]
        public User SalesPerson { get; set; }
        
        public Guid? LocationId { get; set; }
        [ForeignKey("LocationId")]
        public Entities.Location Location { get; set; }

        [NotMapped]
        public string ImageUrl { get; set; }

    }
}
