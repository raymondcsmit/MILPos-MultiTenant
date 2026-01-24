using MediatR;
using POS.Data.Dto;
using POS.Helper;
using System;
using System.Collections.Generic;

namespace POS.MediatR.ProductCategory.Commands
{
    public class GetProductCategorySubCategoriesQuery : IRequest<ServiceResponse<List<ProductCategoryDto>>>
    {
        public Guid Id { get; set; }
    }
}