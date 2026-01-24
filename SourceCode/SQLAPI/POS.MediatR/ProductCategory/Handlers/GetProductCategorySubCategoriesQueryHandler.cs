using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.Helper;
using POS.MediatR.ProductCategory.Commands;
using POS.Repository;

namespace POS.MediatR.ProductCategory.Handlers
{
    public class GetProductCategorySubCategoriesQueryHandler (IProductCategoryRepository _productCategoryRepository,IMapper _mapper): IRequestHandler<GetProductCategorySubCategoriesQuery, ServiceResponse<List<ProductCategoryDto>>>
    {
        public async Task<ServiceResponse<List<ProductCategoryDto>>> Handle(GetProductCategorySubCategoriesQuery request, CancellationToken cancellationToken)
        {
            var category = await _productCategoryRepository.All.Where(c =>c.ParentId == request.Id).ToListAsync();
            if (category == null)
            {
                return ServiceResponse<List<ProductCategoryDto>>.Return404();
            }
            var entityDto = _mapper.Map<List<ProductCategoryDto>>(category);
            return ServiceResponse<List<ProductCategoryDto>>.ReturnResultWith200(entityDto);
        }
    }
}
