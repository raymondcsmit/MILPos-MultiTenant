using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using POS.Data.Dto;
using POS.Data.Resources;

namespace POS.MediatR.SalesOrder.Commands
{
    public class GetSalesOrderTaxItemTotalCommand : IRequest<List<SalesOrderItemTaxDto>>
    {
        public SalesOrderResource SalesOrderResource { get; set; }
    }
}
