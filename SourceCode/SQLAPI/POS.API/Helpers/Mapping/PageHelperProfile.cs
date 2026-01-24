using AutoMapper;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.MediatR.PageHelper.Commands;

namespace POS.API.Helpers.Mapping
{
    public class PageHelperProfile : Profile
    {
        public PageHelperProfile()
        {
            CreateMap<PageHelper, PageHelperDto>().ReverseMap();
            CreateMap<AddPageHelperCommand, PageHelper>();
            CreateMap<UpdatePageHelperCommand, PageHelper>();
        }
    }
}
