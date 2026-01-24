using MediatR;
using POS.Data.Dto.SalesOrder;
using POS.Helper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR.SalesOrder.Report
{
    public class GetCustomerPendingSalesOrderCommand:IRequest<ServiceResponse<List<CustomerPendingSalesOrderDto>>>
    {
        public Guid CustomerId { get; set; }
    }
}
