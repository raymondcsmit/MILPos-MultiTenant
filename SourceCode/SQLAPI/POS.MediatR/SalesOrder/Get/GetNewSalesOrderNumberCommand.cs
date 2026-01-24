using MediatR;

namespace POS.MediatR.CommandAndQuery
{
    public class GetNewSalesOrderNumberCommand : IRequest<string>
    {
        public bool IsSalesOrderRequest { get; set; }
    }
}
