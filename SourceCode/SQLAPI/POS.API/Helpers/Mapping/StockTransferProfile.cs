using AutoMapper;
using POS.Data.Dto;
using POS.Data;
using POS.MediatR.Commands;
using POS.Data.Entities;

namespace POS.API.Helpers.Mapping
{
    public class StockTransferProfile : Profile
    {
        public StockTransferProfile()
        {
            CreateMap<AddStockTransferCommand, StockTransfer>();
            CreateMap<UpdateStockTransferCommand, StockTransfer>();
            CreateMap<StockTransfer, StockTransferDto>().ReverseMap();
            CreateMap<StockTransferItem, StockTransferItemDto>().ReverseMap();
        }
    }
}
