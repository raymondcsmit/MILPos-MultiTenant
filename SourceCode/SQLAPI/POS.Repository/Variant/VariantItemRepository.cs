using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data.Entities;
using POS.Domain;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Repository
{
    public class VariantItemRepository : GenericRepository<VariantItem, POSDbContext>,
           IVariantItemRepository
    {
        public VariantItemRepository(
            IUnitOfWork<POSDbContext> uow
            ) : base(uow)
        {

        }
    }
}