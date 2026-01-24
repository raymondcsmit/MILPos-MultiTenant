using AutoMapper;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.MediatR.Stock.Commands;

namespace POS.API.Helpers.Mapping
{
    public class DamagedStockProfile : Profile
    {
        public DamagedStockProfile()
        {
            CreateMap<DamagedStock, DamagedStockDto>().ReverseMap();
            CreateMap<AddDamagedStockCommand, DamagedStock>();
        }
    }
}
