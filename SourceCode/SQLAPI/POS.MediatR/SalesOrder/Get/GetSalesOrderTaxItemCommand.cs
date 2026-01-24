using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using POS.Data.Dto;

namespace POS.MediatR.SalesOrder.Commands
{
    public class GetSalesOrderTaxItemCommand : IRequest<List<SalesOrderItemTaxDto>>
    {
        public Guid Id { get; set; }
    }
}
