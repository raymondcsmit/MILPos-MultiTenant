
using AutoMapper;
using POS.Data.Dto;
using POS.Data.Entities;

namespace POS.API.Helpers.Mapping
{
    public class ContactAddressProfile : Profile
    {
        public ContactAddressProfile()
        {
            CreateMap<ContactAddress, ContactAddressDto>().ReverseMap();
        }
    }
}
