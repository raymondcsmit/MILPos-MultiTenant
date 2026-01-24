using System.Threading;
using System.Threading.Tasks;
using MediatR;
using POS.MediatR.Commands;
using POS.Repository;

namespace POS.MediatR.Handlers
{
    public class GetAllStockTransferCommandHandler(IStockTransferRepository _stockTransferRepository) 
        : IRequestHandler<GetAllStockTransferCommand, StockTransferList>
    {
        public Task<StockTransferList> Handle(GetAllStockTransferCommand request, CancellationToken cancellationToken)
        {
            return _stockTransferRepository.GetStockTranfers(request.StockTranferResource);
        }
    }
}
