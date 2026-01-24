using System.Threading;
using System.Threading.Tasks;
using MediatR;
using POS.MediatR.Stock.Commands;
using POS.Repository;
using POS.Repository.Stock;

namespace POS.MediatR.Stock.Handlers
{
    public class GetAllDamagedStockQueryHandler (
        IDamagedStockRepository _damagedStockRepository): IRequestHandler<GetAllDamagedStockQuery, DamagedStockList>
    {
        public async Task<DamagedStockList> Handle(GetAllDamagedStockQuery request, CancellationToken cancellationToken)
        {
            return await _damagedStockRepository.GetAllDamagedStocks(request.DamagedStockResource);
        }
    }
}
