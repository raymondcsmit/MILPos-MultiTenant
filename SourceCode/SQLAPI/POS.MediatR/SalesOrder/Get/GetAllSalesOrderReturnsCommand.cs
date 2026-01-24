using MediatR;
using POS.Data.Resources;
using POS.Repository;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR;
public class GetAllSalesOrderReturnsCommand : IRequest<SalesOrderList>
{
    public SalesOrderResource SalesOrderResource { get; set; }
}

public class GetAllSalesOrderQuaryHandler(ISalesOrderRepository salesOrderRepository) : IRequestHandler<GetAllSalesOrderReturnsCommand, SalesOrderList>
{
    public Task<SalesOrderList> Handle(GetAllSalesOrderReturnsCommand request, CancellationToken cancellationToken)
    {
        return salesOrderRepository.GetAllSalesOrdersReturns(request.SalesOrderResource);
    }
}
