using AutoMapper;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.MediatR.Language.Commands;

namespace POS.API.Helpers.Mapping
{
    public class LanguageProfile : Profile
    {
        public LanguageProfile()
        {
            CreateMap<Language, LanguageDto>().ReverseMap();
            CreateMap<AddLanguageCommand, Language>();
            CreateMap<UpdateLanguageCommand, Language>();
            CreateMap<DeleteLanguageCommand, Language>();

        }
    }
}
