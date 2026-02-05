using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.Data.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Repository
{
    public class ProductStockList : List<ProductStockDto>
    {
        public ProductStockList()
        {
        }

        public int Skip { get; private set; }
        public int TotalPages { get; private set; }
        public int PageSize { get; private set; }
        public int TotalCount { get; private set; }

        public ProductStockList(List<ProductStockDto> items, int count, int skip, int pageSize)
        {
            TotalCount = count;
            PageSize = pageSize;
            Skip = skip;
            TotalPages = (int)Math.Ceiling(count / (double)pageSize);
            AddRange(items);
        }

        public async Task<ProductStockList> Create(IQueryable<ProductStock> source, int skip, int pageSize)
        {
            var count = await GetCount(source);
            var dtoList = await GetDtos(source, skip, pageSize);
            var dtoPageList = new ProductStockList(dtoList, count, skip, pageSize);
            return dtoPageList;
        }

        public async Task<int> GetCount(IQueryable<ProductStock> source)
        {
            return await source.AsNoTracking().CountAsync();
        }

        public async Task<List<ProductStockDto>> GetDtos(IQueryable<ProductStock> source, int skip, int pageSize)
        {

            if (pageSize == 0)
            {
                var entities = await source
            .AsNoTracking()
            .Select(c => new ProductStockDto
            {
                Id = c.Id,
                ProductId = c.ProductId,
                ProductName = c.Product.Name,
                Stock = c.CurrentStock,
                 UnitName = c.Product.Unit.Name,
                 UnitId = c.Product.Unit.Id,
                 LocationId = c.LocationId,
                 CategoryName = c.Product.ProductCategory.Name,
                 BrandName = c.Product.Brand.Name
            }).ToListAsync();
                return entities;
            }
            else
            {
                var entities = await source
               .Skip(skip)
               .Take(pageSize)
               .AsNoTracking()
               .Select(c => new ProductStockDto
               {
                   Id = c.Id,
                   ProductId = c.ProductId,
                   ProductName = c.Product.Name,
                   Stock = c.CurrentStock,
                   UnitName = c.Product.Unit.Name,
                   UnitId = c.Product.Unit.Id,
                   LocationId = c.LocationId,
                   CategoryName = c.Product.ProductCategory.Name,
                   BrandName = c.Product.Brand.Name
               }).ToListAsync();
                return entities;
            }

        }
    }
}
