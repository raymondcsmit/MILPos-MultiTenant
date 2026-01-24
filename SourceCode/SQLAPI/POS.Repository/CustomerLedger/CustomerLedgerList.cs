using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.Data.Entities;

namespace POS.Repository
{
    public class CustomerLedgerList : List<CustomerLedgerDto>
    {
        public CustomerLedgerList()
        {

        }
        public int Skip { get; private set; }
        public int TotalPages { get; private set; }
        public int PageSize { get; private set; }
        public int TotalCount { get; private set; }

        public CustomerLedgerList(List<CustomerLedgerDto> items, int count, int skip, int pageSize)
        {
            TotalCount = count;
            PageSize = pageSize;
            Skip = skip;
            TotalPages = (int)Math.Ceiling(count / (double)pageSize);
            AddRange(items);
        }

        public async Task<CustomerLedgerList> Create(IQueryable<CustomerLedger> source, int skip, int pageSize)
        {
            var count = await GetCount(source);
            var dtoList = await GetDtos(source, skip, pageSize);
            var dtoPageList = new CustomerLedgerList(dtoList, count, skip, pageSize);
            return dtoPageList;
        }

        public async Task<int> GetCount(IQueryable<CustomerLedger> source)
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

        public async Task<List<CustomerLedgerDto>> GetDtos(IQueryable<CustomerLedger> source, int skip, int pageSize)
        {
            var entities = await source
                    .Skip(skip)
                    .Take(pageSize)
                    .AsNoTracking()
                    .Select(cs => new CustomerLedgerDto
                    {
                        Id = cs.Id,
                        Date = cs.Date,
                        AccountId = cs.CustomerId,
                        AccountName = cs.Customer != null ? cs.Customer.CustomerName : "",
                        Amount = cs.Amount,
                        Balance = cs.Balance,
                        Overdue = cs.Overdue,
                        Description = cs.Description,
                        LocationId = cs.LocationId,
                        LocationName = cs.Location != null ? cs.Location.Name : null,
                        Note = cs.Note,
                        Reference = cs.Reference,
                    })
                    .ToListAsync();
            return entities;
        }
    }
}
