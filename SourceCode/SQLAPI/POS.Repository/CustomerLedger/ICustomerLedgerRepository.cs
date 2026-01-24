using POS.Common.GenericRepository;
using POS.Data.Entities;
using POS.Data.Resources;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Repository
{
    public interface ICustomerLedgerRepository:IGenericRepository<CustomerLedger>
    {
        Task<CustomerLedgerList> GetAllCustomerLedger(CustomerLedgerResource  customerLedgerResource);
    }
}
