using AutoMapper;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.MediatR.Language.Commands;
using POS.MediatR.Location.Commands;

namespace POS.API.Helpers.Mapping
{
    public class LocationProfile : Profile
    {
        public LocationProfile()
        {
            CreateMap<Location, LocationDto>().ReverseMap();
            CreateMap<AddLocationCommand, Location>();
            CreateMap<UpdateLocationCommand, Location>();
            CreateMap<DeleteLanguageCommand, Location>();
        }
    }
}