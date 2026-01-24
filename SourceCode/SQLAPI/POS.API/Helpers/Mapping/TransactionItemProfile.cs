using AutoMapper;
using POS.Data.Dto;
using POS.Data.Dto.Acconting;
using POS.Data.Entities.Accounts;

namespace POS.API.Helpers.Mapping
{
    public class TransactionItemProfile:Profile
    {
        public TransactionItemProfile()
        {
            CreateMap<TransactionItem, TransactionItemDataDto>()
                 .ForMember(dest => dest.ProductName, opt => opt.MapFrom(src => src.InventoryItem != null ? src.InventoryItem.Name : ""));
        }
    }
}
