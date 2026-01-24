using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Dto.Acconting;
using POS.Data.Entities.Accounts;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Repository.Accouting
{
    public class PaymentEntryList : List<PaymentEntryDto>
    {

        public int Skip { get; private set; }
        public int TotalPages { get; private set; }
        public int PageSize { get; private set; }
        public int TotalCount { get; private set; }
        public PaymentEntryList()
        {

        }
        public PaymentEntryList(List<PaymentEntryDto> items, int count, int skip, int pageSize)
        {
            TotalCount = count;
            PageSize = pageSize;
            Skip = skip;
            TotalPages = (int)Math.Ceiling(count / (double)pageSize);
            AddRange(items);
        }

        public async Task<PaymentEntryList> Create(IQueryable<PaymentEntry> source, int skip, int pageSize)
        {

            var dtoList = await GetDtos(source, skip, pageSize);
            var count = pageSize == 0 || dtoList.Count() == 0 ? dtoList.Count() : await GetCount(source);
            var dtoPageList = new PaymentEntryList(dtoList, count, skip, pageSize);
            return dtoPageList;
        }

        public async Task<int> GetCount(IQueryable<PaymentEntry> source)
        {
            return await source.AsNoTracking().CountAsync();

        }
        public async Task<List<PaymentEntryDto>> GetDtos(IQueryable<PaymentEntry> source, int skip, int pageSize)
        {
            if (pageSize == 0)
            {
                var entities = await source
                             .AsNoTracking()
                             .Select(c => new PaymentEntryDto
                             {
                                 Amount = c.Amount,
                                 BranchId = c.BranchId,
                                 CreatedAt = c.CreatedAt,
                                 Id = c.Id,
                                 Narration = c.Narration,
                                 PaymentDate = c.PaymentDate,
                                 PaymentMethod = c.PaymentMethod,
                                 ReferenceNumber = c.ReferenceNumber,
                                 Status = c.Status,
                                 TransactionId = c.TransactionId,
                                 TransactionNumber = c.Transaction != null ? c.Transaction.TransactionNumber : "",
                                 BranchName = c.Branch != null ? c.Branch.Name : ""
                             })
                             .ToListAsync();
                return entities;
            }
            else
            {
                var entities = await source
                             .Skip(skip)
                             .Take(pageSize)
                             .AsNoTracking()
                             .Select(c => new PaymentEntryDto
                             {
                                 Amount = c.Amount,
                                 BranchId = c.BranchId,
                                 CreatedAt = c.CreatedAt,
                                 Id = c.Id,
                                 Narration = c.Narration,
                                 PaymentDate = c.PaymentDate,
                                 PaymentMethod = c.PaymentMethod,
                                 ReferenceNumber = c.ReferenceNumber,
                                 Status = c.Status,
                                 TransactionId = c.TransactionId,
                                 TransactionNumber = c.Transaction != null ? c.Transaction.TransactionNumber : "",
                                 BranchName = c.Branch != null ? c.Branch.Name : ""
                             })
                             .ToListAsync();
                return entities;
            }
        }
    }
}
