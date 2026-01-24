using AutoMapper;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.MediatR.Category.Commands;

namespace POS.API.Helpers.Mapping
{
    public class ProductCategoryProfile : Profile
    {
        public ProductCategoryProfile()
        {
            CreateMap<ProductCategory, ProductCategoryDto>().ReverseMap();
            CreateMap<AddProductCategoryCommand, ProductCategory>();
            CreateMap<UpdateProductCategoryCommand, ProductCategory>();
        }
    }
}
