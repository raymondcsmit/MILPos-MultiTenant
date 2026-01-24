using System.Threading;
using System.Threading.Tasks;
using MediatR;
using POS.Repository;

namespace POS.MediatR.SalesOrder.Invoice
{
    public class GetPendingSalesOrderCommandHandler(
        ISalesOrderRepository _salesOrderRepository) : IRequestHandler<GetPendingSalesOrderCommand, PendingSalesOrderList>
    {
        public async Task<PendingSalesOrderList> Handle(GetPendingSalesOrderCommand request, CancellationToken cancellationToken)
        {
            return await _salesOrderRepository.GetAllPendingSalesOrder(request.pendingSalesOrderResource);
        }
    }
}
