using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Domain;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace POS.Repository
{
    public class CompanyProfileRepository 
        : GenericRepository<CompanyProfile, POSDbContext>, ICompanyProfileRepository
    {
        private readonly ITenantProvider _tenantProvider;

        public CompanyProfileRepository(IUnitOfWork<POSDbContext> uow, ITenantProvider tenantProvider)
          : base(uow)
        {
            _tenantProvider = tenantProvider;
        }

        public async Task<CompanyProfile> GetCompanyProfile()
        {
            var tenantId = _tenantProvider.GetTenantId();
            if (tenantId.HasValue)
            {
                return await All.FirstOrDefaultAsync(c => c.TenantId == tenantId.Value);
            }
            return await All.FirstOrDefaultAsync();
        }
    }
}
