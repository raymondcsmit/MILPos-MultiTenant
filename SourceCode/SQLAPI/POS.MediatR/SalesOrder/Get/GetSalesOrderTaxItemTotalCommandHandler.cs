using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using POS.Data.Dto;
using POS.MediatR.SalesOrder.Commands;
using POS.Repository;

namespace POS.MediatR.SalesOrder.Handlers
{
    public class GetSalesOrderTaxItemTotalCommandHandler(
        ISalesOrderRepository salesOrderRepository)
        : IRequestHandler<GetSalesOrderTaxItemTotalCommand, List<SalesOrderItemTaxDto>>
    {
        

        public async Task<List<SalesOrderItemTaxDto>> Handle(GetSalesOrderTaxItemTotalCommand request, CancellationToken cancellationToken)
        {
            return await salesOrderRepository.GetAllSalesOrdersItemTaxTotal(request.SalesOrderResource);
        }
    }
}
