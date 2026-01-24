using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto.Acconting;
using POS.Data.Entities;

namespace POS.Repository.Accouting
{
    public class TransactionList : List<TransactionDto>
    {
        public int Skip { get; private set; }
        public int TotalPages { get; private set; }
        public int PageSize { get; private set; }
        public int TotalCount { get; private set; }

        public TransactionList()
        {

        }
        public TransactionList(List<TransactionDto> items, int count, int skip, int pageSize)
        {
            TotalCount = count;
            PageSize = pageSize;
            Skip = skip;
            TotalPages = (int)Math.Ceiling(count / (double)pageSize);
            AddRange(items);
        }
        public async Task<TransactionList> Create(IQueryable<Transaction> source, int skip, int pageSize)
        {
            var count = await GetCount(source);
            var dtoList = await GetDtos(source, skip, pageSize);
            var dtoPageList = new TransactionList(dtoList, count, skip, pageSize);
            return dtoPageList;
        }

        public async Task<int> GetCount(IQueryable<Transaction> source)
        {
            return await source.AsNoTracking().CountAsync();
        }

        public async Task<List<TransactionDto>> GetDtos(IQueryable<Transaction> source, int skip, int pageSize)
        {
            try
            {
                var risk = await source
                    .Skip(skip)
                    .Take(pageSize)
                    .AsNoTracking()
                    .Select(c => new TransactionDto
                    {
                        Id = c.Id,
                        BalanceAmount = c.BalanceAmount,
                        BranchId = c.BranchId,
                        DiscountAmount = c.DiscountAmount,
                        Narration = c.Narration,
                        PaidAmount = c.PaidAmount,
                        PaymentStatus = c.PaymentStatus,
                        ReferenceNumber = c.ReferenceNumber,
                        RoundOffAmount = c.RoundOffAmount,
                        Status = c.Status,
                        SubTotal = c.SubTotal,
                        TaxAmount = c.TaxAmount,
                        TotalAmount = c.TotalAmount,
                        TransactionDate = c.TransactionDate,
                        TransactionNumber = c.TransactionNumber,
                        TransactionType = c.TransactionType,
                        BranchName = c.Branch.Name,
                        IsDeleted = c.IsDeleted
                        
                    })
                    .ToListAsync();
                return risk;
            }
            catch (Exception ex)
            {
                throw new DataException("Error while getting Transaction", ex);
            }
        }
    }
}
