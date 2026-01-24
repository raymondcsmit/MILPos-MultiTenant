using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto.Acconting.Report;
using POS.Data.Entities.Accounts;

namespace POS.Repository.Accouting
{
    public class AccountingEntryList : List<GeneralEntryDto>
    {
        public int Skip { get; private set; }
        public int TotalPages { get; private set; }
        public int PageSize { get; private set; }
        public int TotalCount { get; private set; }
        public ILedgerAccountRepository _ledgerAccountRepository { get; set; }
        public AccountingEntryList(ILedgerAccountRepository ledgerAccountRepository)
        {
            _ledgerAccountRepository = ledgerAccountRepository;
        }

        public AccountingEntryList(List<GeneralEntryDto> items, int count, int skip, int pageSize)
        {
            TotalCount = count;
            PageSize = pageSize;
            Skip = skip;
            TotalPages = (int)Math.Ceiling(count / (double)pageSize);
            AddRange(items);
        }

        public async Task<AccountingEntryList> Create(IQueryable<AccountingEntry> source, int skip, int pageSize)
        {
            //var count = await GetCount(source);
            var dtoList = await GetDtos(source, skip, pageSize);
            var count = pageSize == 0 || dtoList.Count() == 0 ? dtoList.Count() : await GetCount(source);
            var dtoPageList = new AccountingEntryList(dtoList, count * 2, skip, pageSize);
            return dtoPageList;
        }

        public async Task<int> GetCount(IQueryable<AccountingEntry> source)
        {
            return await source.AsNoTracking().CountAsync();
        }

        public async Task<List<GeneralEntryDto>> GetDtos(IQueryable<AccountingEntry> source, int skip, int pageSize)

        {
            try
            {
                var ledgerDict = await _ledgerAccountRepository.All
                    .ToDictionaryAsync(a => a.Id);

                var query = source.AsNoTracking();
                if (pageSize > 0)
                {
                    query = query.Skip(skip / 2).Take(pageSize / 2);
                }
                var generalEntryDtos = query.Select(c=> new
                {
                    c.Amount,
                    TransactionNumber = c.Transaction.TransactionNumber,
                    CreatedDate = c.Transaction.CreatedDate,
                    TransactionType = c.Transaction.TransactionType,
                    DebitAccount = new
                    {
                        c.DebitLedgerAccount.AccountCode,
                        c.DebitLedgerAccount.AccountName,
                        c.DebitLedgerAccount.AccountType
                    },
                    CreditAccount = new
                    {
                        c.CreditLedgerAccount.AccountCode,
                        c.CreditLedgerAccount.AccountName,
                        c.CreditLedgerAccount.AccountType
                    }
                })
                .AsEnumerable()
                .SelectMany(c => new[]
                {
                    new GeneralEntryDto
                        {
                            AccountCode = c.DebitAccount.AccountCode,
                            AccountName = c.DebitAccount.AccountName,
                            DebitAmount = c.Amount,
                            CreditAmount = 0,
                            TransactionNumber = c.TransactionNumber,
                            AccountType = c.DebitAccount.AccountType,
                            CreatedDate = c.CreatedDate,
                            TransactionType = c.TransactionType
                        },
                // Credit side
                   new GeneralEntryDto
                        {
                            AccountCode = c.CreditAccount.AccountCode,
                            AccountName = c.CreditAccount.AccountName,
                            DebitAmount = 0,
                            CreditAmount = c.Amount,
                            TransactionNumber = c.TransactionNumber,
                            AccountType = c.CreditAccount.AccountType,
                            CreatedDate = c.CreatedDate,
                            TransactionType = c.TransactionType
                        }}).ToList();

                return generalEntryDtos;
            }
            catch (Exception ex)
            {
                throw new DataException("Error while getting GeneralEntry", ex);
            }
        }
    }
}
