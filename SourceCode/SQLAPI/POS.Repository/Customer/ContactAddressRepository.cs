using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Entities;
using POS.Domain;

namespace POS.Repository
{
    public class ContactAddressRepository
    : GenericRepository<ContactAddress, POSDbContext>, IContactAddressRepository
    {
        public ContactAddressRepository(IUnitOfWork<POSDbContext> uow)
          : base(uow)
        {
        }
    }
}
