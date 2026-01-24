using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.Data.Entities;

namespace POS.Repository.Stock
{
    public class DamagedStockList : List<DamagedStockDataDto>
    {
        public DamagedStockList()
        {

        }
        public int Skip { get; private set; }
        public int TotalPages { get; private set; }
        public int PageSize { get; private set; }
        public int TotalCount { get; private set; }

        public DamagedStockList(List<DamagedStockDataDto> items, int count, int skip, int pageSize)
        {
            TotalCount = count;
            PageSize = pageSize;
            Skip = skip;
            TotalPages = (int)Math.Ceiling(count / (double)pageSize);
            AddRange(items);
        }

        public async Task<DamagedStockList> Create(IQueryable<DamagedStock> source, int skip, int pageSize)
        {
            var count = await GetCount(source);
            var dtoList = await GetDtos(source, skip, pageSize);
            var dtoPageList = new DamagedStockList(dtoList, count, skip, pageSize);
            return dtoPageList;
        }

        public async Task<int> GetCount(IQueryable<DamagedStock> source)
        {
            try
            {
                return await source.AsNoTracking().CountAsync();
            }
            catch (Exception ex)
            {
                throw ex;
            }

        }

        public async Task<List<DamagedStockDataDto>> GetDtos(IQueryable<DamagedStock> source, int skip, int pageSize)
        {
            var entities = await source
                    .Skip(skip)
                    .Take(pageSize)
                    .AsNoTracking()
                    .Select(cs => new DamagedStockDataDto
                    {
                        Id = cs.Id,
                        DamagedDate = cs.DamagedDate,
                        Location = cs.Location != null ? cs.Location.Name : null,
                        DamagedQuantity = cs.DamagedQuantity,
                        ProductName = cs.Product != null ? cs.Product.Name : null,
                        Reason = cs.Reason,
                        ReportedBy = cs.ReportedBy != null ? $"{cs.ReportedBy.FirstName} {cs.ReportedBy.LastName}" : null,
                    })
                    .ToListAsync();
            return entities;
        }
    }
}
