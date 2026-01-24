using MediatR;
using POS.Data.Resources;
using POS.Repository;

namespace POS.MediatR.SalesOrder.Invoice
{
    public class GetPendingSalesOrderCommand : IRequest<PendingSalesOrderList>
    {
        public PendingSalesOrderResource pendingSalesOrderResource { get; set; }
    }
}
