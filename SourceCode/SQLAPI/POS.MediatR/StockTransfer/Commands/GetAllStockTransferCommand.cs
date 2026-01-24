using MediatR;
using POS.Data.Resources;
using POS.Repository;

namespace POS.MediatR.Commands
{
    public class GetAllStockTransferCommand : IRequest<StockTransferList>
    {
        public StockTranferResource StockTranferResource { get; set; }
    }

}
