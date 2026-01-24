using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;

namespace POS.Repository
{
    public class StockTransferList : List<StockTransferDto>
    {
        public StockTransferList()
        {
        }

        public int Skip { get; private set; }
        public int TotalPages { get; private set; }
        public int PageSize { get; private set; }
        public int TotalCount { get; private set; }

        public StockTransferList(List<StockTransferDto> items, int count, int skip, int pageSize)
        {
            TotalCount = count;
            PageSize = pageSize;
            Skip = skip;
            TotalPages = (int)Math.Ceiling(count / (double)pageSize);
            AddRange(items);
        }

        public async Task<StockTransferList> Create(IQueryable<POS.Data.Entities.StockTransfer> source, int skip, int pageSize)
        {
            var count = await GetCount(source);
            var dtoList = await GetDtos(source, skip, pageSize);
            var dtoPageList = new StockTransferList(dtoList, count, skip, pageSize);
            return dtoPageList;
        }

        public async Task<int> GetCount(IQueryable<POS.Data.Entities.StockTransfer> source)
        {
            return await source.AsNoTracking().CountAsync();
        }

        public async Task<List<StockTransferDto>> GetDtos(IQueryable<POS.Data.Entities.StockTransfer> source, int skip, int pageSize)
        {
            var entities = await source
                .Skip(skip)
                .Take(pageSize)
                .AsNoTracking()
                .Select(c => new StockTransferDto
                {
                    Id = c.Id,
                    FromLocationId = c.FromLocationId,
                    FromLocationName = c.FromLocation.Name,
                    ToLocationId = c.ToLocationId,
                    ToLocationName = c.ToLocation.Name,
                    ReferenceNo = c.ReferenceNo,
                    TotalAmount = c.TotalAmount,
                    TotalShippingCharge = c.TotalShippingCharge,
                    TransferDate = c.TransferDate,
                    Status = c.Status
                })
                .ToListAsync();
            return entities;
        }
    }
}
