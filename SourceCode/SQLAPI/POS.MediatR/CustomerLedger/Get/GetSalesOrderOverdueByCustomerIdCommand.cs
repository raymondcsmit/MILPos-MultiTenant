using MediatR;
using POS.Data;
using POS.Helper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR
{
    public class GetSalesOrderOverdueByCustomerIdCommand:IRequest<ServiceResponse<SaleOrderDepositDto>>  
    {
        public Guid CustomerId { get; set; }
    }
}
