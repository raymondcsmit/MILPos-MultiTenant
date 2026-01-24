using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Domain;
using POS.Repository.Accouting;

namespace POS.Repository
{
    public class TaxRepository(
        ILedgerAccountRepository _ledgerAccountRepository,
        IUnitOfWork<POSDbContext> uow) : GenericRepository<Tax, POSDbContext>(uow), ITaxRepository
    {
        public async Task<TaxAndLedgerAccountDto> GetOutPutGstAccountAsync(Guid taxId)
        {
            var tax = await All.FirstOrDefaultAsync(c => c.Id == taxId);
            var account = await _ledgerAccountRepository.All.FirstOrDefaultAsync(c => c.AccountCode == tax.OutPutAccountCode);
            return new TaxAndLedgerAccountDto
            {
                TaxPercantage = tax.Percentage,
                LedgerAccount = account,
            };
        }
        public async Task<TaxAndLedgerAccountDto> GetInputGstAccountCodeAsync(Guid taxId)
        {
            var tax = await All.FirstOrDefaultAsync(c => c.Id == taxId);
            var account = await _ledgerAccountRepository.All.FirstOrDefaultAsync(c => c.AccountCode == tax.InPutAccountCode);
            return new TaxAndLedgerAccountDto
            {
                TaxPercantage = tax.Percentage,
                LedgerAccount = account,
            };
        }

    }
}
