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
    public class ProductStockAlertList : List<ProductStockAlertDto>
    {
        public ProductStockAlertList()
        {
        }

        public int Skip { get; private set; }
        public int TotalPages { get; private set; }
        public int PageSize { get; private set; }
        public int TotalCount { get; private set; }

        public ProductStockAlertList(List<ProductStockAlertDto> items, int count, int skip, int pageSize)
        {
            TotalCount = count;
            PageSize = pageSize;
            Skip = skip;
            TotalPages = (int)Math.Ceiling(count / (double)pageSize);
            AddRange(items);
        }

        public async Task<ProductStockAlertList> Create(IQueryable<ProductStock> source, int skip, int pageSize)
        {
            var count = await GetCount(source);
            var dtoList = await GetDtos(source, skip, pageSize);
            var dtoPageList = new ProductStockAlertList(dtoList, count, skip, pageSize);
            return dtoPageList;
        }

        public async Task<int> GetCount(IQueryable<ProductStock> source)
        {
            return await source.AsNoTracking().CountAsync();
        }

        public async Task<List<ProductStockAlertDto>> GetDtos(IQueryable<ProductStock> source, int skip, int pageSize)
        {

            var entities = await source
               .Skip(skip)
               .Take(pageSize)
               .AsNoTracking()
               .Select(c => new ProductStockAlertDto
               {
                   ProductId = c.ProductId,
                   ProductName = c.Product.Name,
                   Stock = c.CurrentStock,
                   BusinessLocation = c.Location.Name,
                   Unit = c.Product.Unit.Name
               }).ToListAsync();

            return entities;

        }
    }
}
