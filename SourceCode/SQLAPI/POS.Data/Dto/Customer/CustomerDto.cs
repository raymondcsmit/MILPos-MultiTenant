using System;
using System.Collections.Generic;

namespace POS.Data.Dto
{
    public class CustomerDto
    {
        public Guid? Id { get; set; }
        public string CustomerName { get; set; }
        public string ContactPerson { get; set; }
        public string Email { get; set; }
        public string Fax { get; set; }
        public string MobileNo { get; set; }
        public string PhoneNo { get; set; }
        public string Website { get; set; }
        public string Description { get; set; }
        public string Url { get; set; }
        public string Logo { get; set; }
        public ContactAddressDto BillingAddress { get; set; }
        public ContactAddressDto ShippingAddress { get; set; }
        public string TaxNumber { get; set; }
        public bool IsImageUpload { get; set; }
        public string ImageUrl { get; set; }
        public bool IsWalkIn { get; set; }
    }
}
