using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using POS.Common.GenericRepository;
using POS.Data;
using POS.Data.Entities;

namespace POS.Repository
{
    public interface IContactAddressRepository : IGenericRepository<ContactAddress>
    {
    }
}
