using AutoMapper;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.MediatR;

namespace POS.API.Helpers.Mapping
{
    public class CustomerLedgerProfile:Profile
    {
        public CustomerLedgerProfile()
        {
            CreateMap<CustomerLedger, CustomerLedgerDto>().ReverseMap();
            CreateMap<AddCustomerLedgerCommand, CustomerLedger>();
        }
    }
}
