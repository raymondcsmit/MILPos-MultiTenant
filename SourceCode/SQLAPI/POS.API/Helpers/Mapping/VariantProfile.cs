using POS.Data.Dto;
using POS.Data;
using POS.MediatR.Tax.Commands;
using AutoMapper;
using POS.Data.Entities;
using POS.MediatR;

namespace POS.API.Helpers.Mapping
{

    public class VariantProfile : Profile
    {
        /// <summary>
        /// Constructor
        /// </summary>
        public VariantProfile()
        {
            CreateMap<Variant, VariantDto>().ReverseMap();
            CreateMap<VariantItem, VariantItemDto>().ReverseMap();
            CreateMap<AddVariantCommand, Variant>();
            CreateMap<UpdateVariantCommand, Variant>();
        }
    }
}
