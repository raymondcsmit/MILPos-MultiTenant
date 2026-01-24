using POS.Data.Dto;
using POS.Helper;
using MediatR;
using System;

namespace POS.MediatR.CommandAndQuery
{
    public class UpdateCustomerCommand : IRequest<ServiceResponse<CustomerDto>>
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
        public string Logo { get; set; }
        public Guid? BillingAddressId { get; set; }
        public Guid? ShippingAddressId { get; set; }
        public ContactAddressDto BillingAddress { get; set; }
        public ContactAddressDto ShippingAddress { get; set; }
        public string TaxNumber { get; set; }
        public bool IsImageUpload { get; set; }
    }
}
