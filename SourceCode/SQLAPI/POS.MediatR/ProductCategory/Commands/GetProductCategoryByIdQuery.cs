using System;
using MediatR;
using POS.Data.Dto;
using POS.Helper;

namespace POS.MediatR.Category.Commands
{
    public class GetProductCategoryByIdQuery : IRequest<ServiceResponse<ProductCategoryDto>>
    {
        public Guid Id { get; set; }
    }
}
