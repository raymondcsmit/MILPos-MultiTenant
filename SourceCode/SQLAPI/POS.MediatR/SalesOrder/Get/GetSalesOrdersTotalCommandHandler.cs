using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using POS.Data.Dto.PurchaseOrder;
using POS.Repository;

namespace POS.MediatR
{
    public class GetSalesOrdersTotalCommandHandler : IRequestHandler<GetSalesOrdersTotalCommand, PurchaseSalesTotalDto>
    {
        private readonly ISalesOrderRepository _salesOrderRepository;

        public GetSalesOrdersTotalCommandHandler(ISalesOrderRepository salesOrderRepository)
        {
            _salesOrderRepository = salesOrderRepository;
        }

        public async Task<PurchaseSalesTotalDto> Handle(GetSalesOrdersTotalCommand request, CancellationToken cancellationToken)
        {
            return await _salesOrderRepository.GetAllSalesOrdersTotal(request.SalesOrderResource);
        }
    }
}
