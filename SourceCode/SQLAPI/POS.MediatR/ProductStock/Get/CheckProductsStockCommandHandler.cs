using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.Helper;
using POS.Repository;

namespace POS.MediatR
{
    public class CheckProductsStockCommandHandler(
        IProductRepository productRepository,
        IProductStockRepository _productStockRepository) : IRequestHandler<CheckProductsStockCommand, ServiceResponse<List<ProductUnitQuantityDto>>>
    {
        public async Task<ServiceResponse<List<ProductUnitQuantityDto>>> Handle(CheckProductsStockCommand request, CancellationToken cancellationToken)
        {
            var productInventoryUnits = productRepository.All
                 .Include(x => x.ProductStocks.Where(c => c.LocationId == request.LocationId))
                 .Include(x => x.Unit)
                 .Where(x => request.ProductIds.Select(c => c.ProductId).Contains(x.Id))
                  .Select(x => new ProductInventoryStockDto
                  {
                      Name = x.Name,
                      Id = x.Id,
                      UnitId = x.UnitId,
                      ProductStocks = x.ProductStocks,
                      UnitName = x.Unit.Name,
                      ParentUnitId = x.Unit.ParentId,
                      Stock = (double)x.CurrentStock
                  }).ToList();

            List<ProductUnitQuantityDto> productInventoryStockDtos = new List<ProductUnitQuantityDto>();

            foreach (var item in productInventoryUnits)
            {
                //decimal stock = item.ProductStocks.FirstOrDefault() != null ? item.ProductStocks.FirstOrDefault().CurrentStock : 0;
                decimal stock = item.ProductStocks.FirstOrDefault(c => c.LocationId == request.LocationId)?.CurrentStock ?? 0;
                if (request.ProductIds.Any(c => c.ProductId == item.Id) && !request.ProductIds.Any(c => c.UnitId == item.UnitId) && item.ProductStocks.Count > 0)
                {
                    var unitId = request.ProductIds.Where(c => c.ProductId == item.Id).FirstOrDefault().UnitId;
                    stock = _productStockRepository.ConvertStockAndPriceBaseUnitToUnit(unitId, item.ProductStocks.FirstOrDefault());
                }
                productInventoryStockDtos.Add(new ProductUnitQuantityDto
                {
                    ProductId = item.Id,
                    Name = item.Name,
                    Stock = stock,
                    UnitId = item.UnitId
                });
            }
            return ServiceResponse<List<ProductUnitQuantityDto>>.ReturnResultWith200(productInventoryStockDtos);
        }
    }
}
