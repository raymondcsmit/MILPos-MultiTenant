using POS.Common.GenericRepository;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities.Accounts;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Repository
{
    public interface ITaxRepository : IGenericRepository<Tax>
    {
        Task<TaxAndLedgerAccountDto> GetOutPutGstAccountAsync(Guid taxId);
        Task<TaxAndLedgerAccountDto> GetInputGstAccountCodeAsync(Guid taxId);
    }
}
